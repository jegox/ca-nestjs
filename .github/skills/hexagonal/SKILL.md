# Skill: Arquitectura Hexagonal (Ports & Adapters)

> Skill especializada en Arquitectura Hexagonal para el workspace Vendex.
> El patrón ya está implementado en los tres repositorios. Esta skill documenta cómo mantenerlo y extenderlo correctamente.

---

## CONCEPTOS FUNDAMENTALES

La Arquitectura Hexagonal (también llamada Ports & Adapters, propuesta por Alistair Cockburn) tiene un principio central:

> **El dominio de negocio es el núcleo. Todo lo demás (frameworks, bases de datos, APIs externas) son detalles intercambiables.**

```
              ┌─────────────────────────────────┐
              │         INFRASTRUCTURE          │
              │  (NestJS, TypeORM, HTTP, AWS)   │
              │                                 │
              │    ┌───────────────────────┐    │
              │    │      USE CASES        │    │
              │    │   (Orquestación)      │    │
              │    │                       │    │
              │    │   ┌─────────────┐     │    │
              │    │   │   DOMAIN    │     │    │
              │    │   │  (Core)     │     │    │
              │    │   └─────────────┘     │    │
              │    └───────────────────────┘    │
              └─────────────────────────────────┘
```

---

## REGLA DE DEPENDENCIA

**Las dependencias solo apuntan hacia adentro.** Nunca hacia afuera.

```
Infrastructure → UseCase → Domain
                              ↑
                    (No conoce Infrastructure)
```

### Comprobación rápida
Si en `domain/` encuentras alguno de estos imports, hay una violación:
```typescript
// ❌ VIOLACIONES — domain NO debe importar esto:
import { Injectable } from '@nestjs/common';        // NestJS
import { InjectRepository } from '@nestjs/typeorm'; // TypeORM
import { Entity, Column } from 'typeorm';           // TypeORM
import { Repository } from 'typeorm';               // TypeORM
import axios from 'axios';                          // HTTP client
import { S3Client } from '@aws-sdk/client-s3';      // AWS SDK
```

---

## CAPAS DEL WORKSPACE VENDEX

### 1. DOMAIN LAYER — El Núcleo

Contiene la lógica de negocio pura. No depende de ningún framework.

#### Qué va en domain/
```
domain/
├── models/          ← Entidades de dominio (Plain TypeScript classes)
├── ports/           ← Contratos de casos de uso (Abstract classes)
├── repositories/    ← Contratos de persistencia (Abstract classes)
├── services/        ← Contratos de servicios (Abstract classes)
├── adapters/        ← Contratos de integraciones externas (Abstract classes)
├── dtos/            ← Objetos de transferencia de datos (con class-validator)
├── enums/           ← Enumeraciones de dominio
├── interfaces/      ← Interfaces TypeScript de datos
├── mappers/         ← Contratos de mapeo
├── constants/       ← Constantes de dominio
└── templates/       ← Templates Handlebars para documentos
```

#### Models (Entidades de Dominio)
```typescript
// domain/models/invoice.model.ts
// ✅ Plain TypeScript — sin decoradores de infraestructura
export class InvoiceModel {
  id: string;
  sequence: number;
  paymentType: PAYMENT_TYPE;
  subTotal: number;
  total: number;
  vat: number;
  isActive: boolean;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  client: ClientModel;
  company: CompanyModel;
  details: InvoiceDetailModel[];
}
```

#### Ports (Contratos de Use Cases)
```typescript
// domain/ports/create-invoice.usecase.ts
// ✅ Abstract class (no interface) para funcionar con el DI de NestJS
export abstract class ICreateInvoiceUseCase {
  abstract handle(dto: CreateInvoiceDTO): Promise<InvoiceModel>;
}

// domain/ports/index.ts — barrel file
export * from './create-invoice.usecase';
export * from './cancel-invoice.usecase';
export * from './get-invoices.usecase';
```

> **¿Por qué abstract class y no interface?**
> NestJS usa tokens de inyección en runtime (JavaScript). Las interfaces TypeScript desaparecen al compilar. Las abstract classes persisten como valores JavaScript, por lo que pueden usarse como tokens de DI: `{ provide: ICreateInvoiceUseCase, useClass: CreateInvoiceUseCase }`.

#### Repositories Abstractos
```typescript
// domain/repositories/base.repository.ts
export abstract class IBaseRepository<T> {
  abstract save(doc: T): Promise<T>;
  abstract delete(doc: T): Promise<T>;
  abstract create(): Promise<T>;
  abstract findOne(options: Record<string, unknown>): Promise<T | null>;
  abstract find(options: Record<string, unknown>): Promise<T[]>;
  abstract paginate(
    options: IPaginationOptions,
    query: Record<string, unknown>,
  ): Promise<IPagination<T>>;
  abstract rawQuery(expression: string, parameters?: unknown[]): Promise<unknown[]>;
}

// domain/repositories/invoice.repository.ts
export abstract class IInvoiceRepository extends IBaseRepository<InvoiceModel> {
  abstract findByCompany(companyId: string, pagination: IPaginationOptions): Promise<IPagination<InvoiceModel>>;
  abstract findByClient(clientId: string): Promise<InvoiceModel[]>;
}
```

#### Services Abstractos
```typescript
// domain/services/email.service.ts
export abstract class IEmailService {
  abstract send(params: IMailParams): Promise<void>;
}

// domain/services/pdf.service.ts
export abstract class IPDFService {
  abstract generate(data: unknown, templateName: string): Promise<Buffer>;
}
```

#### Adapters Abstractos (para integraciones externas)
```typescript
// domain/adapters/storage.adapter.ts
export abstract class IStorageAdapter {
  abstract upload(file: Buffer, name: string, type: string): Promise<string>;
  abstract download(fileId: string): Promise<Buffer>;
}
```

---

### 2. APPLICATION LAYER — Use Cases

Los use cases orquestan el dominio para completar un caso de uso de negocio.

#### Qué van en usecase(s)/
```
usecases/
├── invoice/
│   ├── create-invoice.usecase.ts
│   ├── cancel-invoice.usecase.ts
│   ├── get-invoice.usecase.ts
│   ├── get-invoices.usecase.ts
│   └── invoice-file.usecase.ts
├── budget/
│   └── ...
└── index.ts
```

#### Estructura de un Use Case
```typescript
// usecases/invoice/create-invoice.usecase.ts
@Injectable()
export class CreateInvoiceUseCase implements ICreateInvoiceUseCase {
  private readonly logger = new Logger(CreateInvoiceUseCase.name);

  constructor(
    // ✅ Depende de abstracciones (ports), no de implementaciones
    private readonly invoiceRepo: IInvoiceRepository,
    private readonly productRepo: IProductRepository,
    private readonly clientRepo: IClientRepository,
  ) {}

  async handle(dto: CreateInvoiceDTO): Promise<InvoiceModel> {
    this.logger.log(`Creating invoice — client: ${dto.clientId}`);

    // 1. Validar que el cliente existe
    const client = await this.clientRepo.findOne({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException(`Client ${dto.clientId} not found`);

    // 2. Validar stock de productos
    for (const detail of dto.details) {
      const product = await this.productRepo.findOne({ where: { id: detail.productId } });
      if (!product) throw new NotFoundException(`Product ${detail.productId} not found`);
      if (product.stock < detail.quantity) {
        throw new BadRequestException(`Insufficient stock for product ${product.name}`);
      }
    }

    // 3. Crear la factura
    const invoice = await this.invoiceRepo.save({
      ...dto,
      isActive: true,
      createdAt: new Date(),
    } as InvoiceModel);

    this.logger.log(`Invoice created — id: ${invoice.id}`);
    return invoice;
  }
}
```

#### Reglas de los Use Cases
1. Un use case = una responsabilidad
2. Método principal siempre se llama `handle()`
3. Solo usa ports (abstracciones), nunca implementaciones concretas
4. Puede lanzar excepciones de dominio específicas
5. Implementa el port correspondiente del dominio

---

### 3. INFRASTRUCTURE LAYER — Adaptadores

Contiene todas las implementaciones concretas que conectan el dominio con el mundo exterior.

#### Qué va en infrastructure/
```
infrastructure/
├── controllers/     ← HTTP adapters (NestJS controllers)
├── entities/        ← TypeORM entities (mapping a DB)
├── repositories/    ← Implementaciones de IXxxRepository
├── services/        ← Implementaciones de IXxxService
├── adapters/        ← Clientes HTTP, SDKs externos
├── strategies/      ← Passport strategies
├── guards/          ← NestJS guards
├── interceptors/    ← NestJS interceptors
├── middleware/      ← NestJS middleware
├── modules/         ← Wiring de DI (NestJS modules)
├── mappers/         ← Transformaciones infra ↔ dominio
├── config/          ← Configuración de entorno
└── swagger/         ← Configuración de Swagger
```

#### Repository Implementation
```typescript
// infrastructure/repositories/invoice.repository.ts
@Injectable()
export class InvoiceRepository
  extends BaseRepository<Invoice>
  implements IInvoiceRepository {

  constructor(
    @InjectRepository(Invoice)
    private readonly repo: Repository<Invoice>,
  ) {
    super(repo);
  }

  async findByCompany(
    companyId: string,
    paginationOptions: IPaginationOptions,
  ): Promise<IPagination<InvoiceModel>> {
    const queryBuilder = this.repo
      .createQueryBuilder('invoice')
      .where('invoice.company = :companyId', { companyId })
      .andWhere('invoice.isActive = true')
      .orderBy('invoice.createdAt', 'DESC');

    const result = await paginate<Invoice>(queryBuilder, paginationOptions);

    return {
      items: result.items.map(this.toModel),
      meta: result.meta,
      links: result.links,
    };
  }

  private toModel(entity: Invoice): InvoiceModel {
    return {
      id: entity.id,
      total: entity.total,
      paymentType: entity.paymentType as PAYMENT_TYPE,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
    } as InvoiceModel;
  }
}
```

#### Service Implementation
```typescript
// infrastructure/services/email.service.ts
@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly brevo: SibApiV3Sdk.TransactionalEmailsApi;

  constructor(@Inject(config.KEY) private readonly configService: ConfigType<typeof config>) {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    defaultClient.authentications['api-key'].apiKey = configService.notifications.brevo;
    this.brevo = new SibApiV3Sdk.TransactionalEmailsApi();
  }

  async send(params: IMailParams): Promise<void> {
    try {
      await this.brevo.sendTransacEmail({
        templateId: params.templateId,
        to: params.to,
        params: params.variables,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${params.to[0].email}`, err.stack);
      throw new InternalServerErrorException('Email delivery failed');
    }
  }
}
```

#### External Adapter (integración HTTP)
```typescript
// infrastructure/adapters/proemion.adapter.ts
@Injectable()
export class ProemionAdapter implements IProemionAdapter {
  public instance: AxiosInstance;
  private token: string | null = null;
  private expiresAt: number = 0;

  constructor(
    private readonly http: HttpService,
    @Inject(config.KEY) private readonly configService: ConfigType<typeof config>,
  ) {
    this.instance = this.http.axiosRef;
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor: agregar token
    this.instance.interceptors.request.use(async (req) => {
      await this.refreshTokenIfNeeded();
      req.headers['Authorization'] = `Bearer ${this.token}`;
      return req;
    });

    // Response interceptor: manejar 401
    this.instance.interceptors.response.use(
      (res) => res,
      async (err) => {
        if (err.response?.status === 401) {
          this.token = null;
          return Promise.reject(new UnauthorizedException('External API token expired'));
        }
        return Promise.reject(err);
      },
    );
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (this.token && Date.now() < this.expiresAt) return;
    await this.authenticate();
  }
}
```

---

## DEPENDENCY RULE — El contrato fundamental

```
┌──────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE                            │
│  Controller → UseCase (via port)                                 │
│  Repository impl → TypeORM Entity → DB                           │
│  Service impl → AWS SDK / Brevo / Puppeteer                      │
│                                                                  │
│    ┌──────────────────────────────────────────────────────────┐  │
│    │                    USE CASES                             │  │
│    │  UseCase depends on → IRepository, IService (ports)     │  │
│    │                                                          │  │
│    │    ┌──────────────────────────────────────────────────┐  │  │
│    │    │                   DOMAIN                         │  │  │
│    │    │  Models, Ports, Enums, DTOs, Interfaces          │  │  │
│    │    │  NO framework dependencies                       │  │  │
│    │    └──────────────────────────────────────────────────┘  │  │
│    └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

Arrows of dependency: Infrastructure → UseCase → Domain
NEVER: Domain → Infrastructure
NEVER: Domain → UseCase
```

---

## CÓMO AGREGAR UN NUEVO FEATURE

### Checklist paso a paso

**1. Domain — Define los contratos**
```
□ Crear domain/models/xxx.model.ts         (entidad sin decoradores)
□ Crear domain/ports/create-xxx.usecase.ts (abstract class)
□ Crear domain/ports/get-xxx.usecase.ts
□ Crear domain/repositories/xxx.repository.ts (abstract class)
□ Crear domain/dtos/xxx/create-xxx.dto.ts
□ Actualizar domain/ports/index.ts
□ Actualizar domain/repositories/index.ts
```

**2. Application — Implementa los use cases**
```
□ Crear usecases/xxx/create-xxx.usecase.ts
□ Crear usecases/xxx/get-xxx.usecase.ts
□ Actualizar usecases/index.ts
```

**3. Infrastructure — Implementa los adaptadores**
```
□ Crear infrastructure/entities/xxx.entity.ts  (TypeORM)
□ Crear infrastructure/repositories/xxx.repository.ts
□ Crear infrastructure/controllers/xxx.controller.ts
□ Crear infrastructure/modules/xxx.module.ts   (wiring DI)
□ Importar XxxModule en AppModule
```

**4. Tests**
```
□ Crear test/unit/usecases/create-xxx.usecase.spec.ts
□ Crear test/e2e/xxx.e2e-spec.ts
```

---

## ERRORES COMUNES

### ❌ Usar repositorio TypeORM directamente en use case
```typescript
// ❌ INCORRECTO — acoplamiento directo a TypeORM
@Injectable()
export class CreateInvoiceUseCase {
  constructor(
    @InjectRepository(Invoice)
    private readonly repo: Repository<Invoice>,  // TypeORM directo en use case
  ) {}
}
```

```typescript
// ✅ CORRECTO — depende del port abstracto
@Injectable()
export class CreateInvoiceUseCase implements ICreateInvoiceUseCase {
  constructor(private readonly invoiceRepo: IInvoiceRepository) {}
}
```

### ❌ Lógica de negocio en el controller
```typescript
// ❌ INCORRECTO
@Post()
async create(@Body() body: CreateInvoiceDTO) {
  if (body.total <= 0) throw new BadRequestException('Invalid total');
  const invoice = await this.repo.save(body);  // Acceso directo a repo
  await this.emailService.send({ to: body.email, template: 1 });
  return invoice;
}
```

```typescript
// ✅ CORRECTO — toda la lógica en el use case
@Post()
async create(@Body() body: CreateInvoiceDTO) {
  return this.createInvoice.handle(body);
}
```

### ❌ Entidad TypeORM como modelo de dominio
```typescript
// ❌ INCORRECTO — el dominio conoce TypeORM
// domain/models/invoice.model.ts
@Entity('invoices')
export class InvoiceModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;
}
```

```typescript
// ✅ CORRECTO — modelo limpio + entidad separada
// domain/models/invoice.model.ts
export class InvoiceModel { id: string; total: number; }

// infrastructure/entities/invoice.entity.ts
@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() total: number;
}
```

---

*Skill generada a partir del análisis del workspace Vendex — Junio 2026.*
