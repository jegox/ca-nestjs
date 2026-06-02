---
applyTo: "**/*.ts"
---

# Project Coding Instructions — Vendex Workspace

> Estas instrucciones aplican a todos los repositorios del workspace (tracking-trucks-api, versatil-api, asapi).
> Se basan en los patrones encontrados en el código fuente existente y en principios de NestJS + Arquitectura Hexagonal.

---

## 1. ARQUITECTURA

Este workspace usa **Arquitectura Hexagonal (Ports & Adapters)** con tres capas:

```
domain/        ← Lógica de negocio pura. SIN dependencias de NestJS o TypeORM.
usecase(s)/    ← Orquestación de casos de uso. Implementa los ports del dominio.
infrastructure/ ← Adaptadores: NestJS, TypeORM, HTTP, servicios externos.
```

**Regla absoluta:** `domain/` nunca importa desde `infrastructure/` ni desde NestJS.

---

## 2. CONVENCIONES DE NOMENCLATURA

### Archivos
- **kebab-case** para todos los archivos: `create-invoice.usecase.ts`, `invoice.repository.ts`
- Sufijos obligatorios por tipo:
  - `.usecase.ts` — casos de uso
  - `.repository.ts` — repositorios (domain = abstract, infra = implementation)
  - `.service.ts` — servicios
  - `.controller.ts` — controladores HTTP
  - `.entity.ts` — entidades TypeORM
  - `.model.ts` — modelos de dominio
  - `.dto.ts` — Data Transfer Objects
  - `.enum.ts` — enumeraciones
  - `.interface.ts` — interfaces TypeScript
  - `.guard.ts` — guards de NestJS
  - `.strategy.ts` — estrategias de autenticación
  - `.mapper.ts` — mappers de datos
  - `.module.ts` — módulos de NestJS

### Clases e Interfaces
```typescript
// ✅ Correcto
class InvoiceModel { }                    // Modelos de dominio: PascalCase + sufijo Model
abstract class IInvoiceRepository { }     // Ports: I + PascalCase (abstract class)
class InvoiceRepository { }               // Implementaciones: PascalCase sin prefijo
class CreateInvoiceUseCase { }            // Use cases: verbo + entidad + UseCase
interface IMailParams { }                 // Interfaces: I + PascalCase
enum PAYMENT_TYPE { CASH, CREDIT }        // Enums: UPPER_SNAKE_CASE valores

// ❌ Incorrecto
class invoice_model { }
class InvoiceRepo { }
interface MailParams { }                  // Falta prefijo I
```

### Variables y Funciones
```typescript
// ✅ Correcto
const invoiceTotal = calculateTotal(items);
async function findActiveInvoices(): Promise<InvoiceModel[]> { }

// ❌ Incorrecto
const t = calc(i);
async function get() { }
```

---

## 3. TYPESCRIPT

### Configuración requerida en proyectos nuevos
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

> En proyectos existentes con `strict: false`, migrar módulo por módulo. No regresar a `false`.

### Tipos explícitos
```typescript
// ✅ Siempre declarar tipo de retorno en métodos públicos
async handle(dto: CreateInvoiceDTO): Promise<InvoiceModel> {
  // ...
}

// ✅ Evitar any — usar tipos genéricos o unknown
function parseResponse<T>(data: unknown): T {
  return data as T;
}

// ❌ Evitar
async handle(dto: any): Promise<any> { }
```

### Imports con path aliases
```typescript
// ✅ Usar aliases definidos en tsconfig
import { IInvoiceRepository } from '@domain/repositories';
import { InvoiceRepository } from '@infrastructure/repositories';

// ❌ Evitar rutas relativas profundas
import { IInvoiceRepository } from '../../../../domain/repositories';
```

---

## 4. NESTJS

### Controllers
- **Un controller por recurso/entidad**
- Solo inyectar use cases (ports), nunca repositories ni services directamente
- Decoradores obligatorios: `@ApiTags`, `@ApiBearerAuth` (si requiere auth), `@Controller`
- Usar `@HttpCode(HttpStatus.CREATED)` en métodos POST
- Usar DTOs tipados en `@Body()`, `@Param()`, `@Query()`

```typescript
@ApiBearerAuth()
@ApiTags('INVOICE')
@UseGuards(AuthGuard('jwt'))
@Controller('invoice')
export class InvoiceController {
  constructor(
    private readonly createInvoice: ICreateInvoiceUseCase,
    private readonly getInvoice: IInvoiceUseCase,
    private readonly getInvoices: IInvoicesUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateInvoiceDTO): Promise<InvoiceModel> {
    return this.createInvoice.handle(body);
  }

  @Get(':id')
  async findOne(@Param() { id }: ParamUuidDTO): Promise<InvoiceModel> {
    return this.getInvoice.handle(id);
  }
}
```

### Providers (Módulos)
- Siempre registrar implementaciones usando `{ provide: IPort, useClass: Implementation }`
- Módulos feature-based: un módulo por dominio/recurso
- Evitar módulos dios (god modules) con 50+ providers

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([InvoiceEntity, InvoiceDetailEntity])],
  controllers: [InvoiceController],
  providers: [
    { provide: ICreateInvoiceUseCase, useClass: CreateInvoiceUseCase },
    { provide: IInvoiceUseCase, useClass: InvoiceUseCase },
    { provide: IInvoiceRepository, useClass: InvoiceRepository },
  ],
})
export class InvoiceModule {}
```

### Guards
- **Todos los endpoints deben estar protegidos** salvo los marcados explícitamente con `@Public()`
- Usar `RolesGuard` + `@Roles(USER_ROLES.ADMIN)` para control de acceso granular
- Nunca dejar guards definidos sin aplicar

```typescript
// ✅ Endpoint público explícito
@Public()
@Post('login')
async login(@Body() body: AuthDTO) { }

// ✅ Endpoint protegido (por defecto)
@Get()
async findAll() { }
```

### Pipes
- `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- Validación de UUIDs en params: usar `ParamUuidDTO` con `@IsUUID()`
- Validación de paginación: usar `PaginationDTO` reutilizable

### Interceptors
- `ResponseInterceptor` global para respuestas con formato `{ status: true, data: T }`
- `ErrorsInterceptor` global para manejo centralizado de errores HTTP

---

## 5. DOMAIN LAYER

### Ports (Abstract Classes)
```typescript
// domain/ports/create-invoice.usecase.ts
export abstract class ICreateInvoiceUseCase {
  abstract handle(dto: CreateInvoiceDTO): Promise<InvoiceModel>;
}
```

### Repositories Abstractos
```typescript
// domain/repositories/invoice.repository.ts
export abstract class IInvoiceRepository extends IBaseRepository<InvoiceModel> {
  abstract findByCompany(companyId: string): Promise<InvoiceModel[]>;
}
```

### Modelos de Dominio
- **Plain TypeScript classes** — sin decoradores de TypeORM, NestJS o class-validator
- Representan el estado del dominio, no la persistencia

```typescript
// ✅ Correcto — modelo de dominio limpio
export class InvoiceModel {
  id: string;
  total: number;
  paymentType: PAYMENT_TYPE;
  isActive: boolean;
  createdAt: Date;
}

// ❌ Incorrecto — modelo con decoradores de infraestructura
@Entity()
export class InvoiceModel {
  @Column() total: number;
}
```

---

## 6. USE CASES

- Un archivo por caso de uso: `create-invoice.usecase.ts`
- Método único: `handle(input): Promise<output>`
- Solo orquesta: llama repositorios y servicios, no implementa lógica de negocio compleja
- Inyectar dependencias vía constructor (los ports, no las implementaciones)

```typescript
@Injectable()
export class CreateInvoiceUseCase implements ICreateInvoiceUseCase {
  private readonly logger = new Logger(CreateInvoiceUseCase.name);

  constructor(
    private readonly invoiceRepo: IInvoiceRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  async handle(dto: CreateInvoiceDTO): Promise<InvoiceModel> {
    this.logger.log(`Creating invoice for client ${dto.clientId}`);
    // orquestación...
  }
}
```

---

## 7. REPOSITORIES

### Abstracto (domain)
```typescript
export abstract class IBaseRepository<T> {
  abstract save(doc: T): Promise<T>;
  abstract delete(doc: T): Promise<T>;
  abstract create(): Promise<T>;
  abstract findOne(options: Record<string, unknown>): Promise<T>;
  abstract find(options: Record<string, unknown>): Promise<T[]>;
  abstract paginate(options: IPaginationOptions, query: unknown): Promise<IPagination<T>>;
}
```

### Concreto (infrastructure)
```typescript
@Injectable()
export class InvoiceRepository
  extends BaseRepository<Invoice>
  implements IInvoiceRepository {
  constructor(
    @InjectRepository(Invoice)
    private readonly repository: Repository<Invoice>,
  ) {
    super(repository);
  }
}
```

---

## 8. DTOs

- Ubicados en `domain/dtos/` — son contratos, no tienen lógica de negocio
- Decoradores `class-validator` para validación
- `class-transformer` para transformación/serialización
- Usar `PartialType()` para DTOs de actualización

```typescript
export class CreateInvoiceDTO {
  @IsEnum(PAYMENT_TYPE)
  paymentType: PAYMENT_TYPE;

  @IsUUID()
  clientId: string;

  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceDetailDTO)
  details: CreateInvoiceDetailDTO[];
}

export class UpdateInvoiceDTO extends PartialType(CreateInvoiceDTO) {}
```

---

## 9. MANEJO DE ERRORES

### Jerarquía de excepciones
```typescript
// ✅ Excepciones de dominio específicas
throw new NotFoundException(`Invoice with id ${id} not found`);
throw new ConflictException(`Invoice ${sequence} already canceled`);
throw new BadRequestException(`Payment type ${type} is not valid`);

// ❌ Evitar excepciones genéricas sin contexto
throw new InternalServerErrorException();
```

### Nunca swallow errors silenciosamente
```typescript
// ❌ Incorrecto
try {
  await this.service.send(email);
} catch (err) {
  console.log(err); // Se pierde el error
}

// ✅ Correcto
try {
  await this.service.send(email);
} catch (err) {
  this.logger.error(`Failed to send email to ${email.to}`, err.stack);
  throw new InternalServerErrorException('Email delivery failed');
}
```

---

## 10. LOGGING

**Usar el Logger de NestJS — nunca `console.log` en producción.**

```typescript
@Injectable()
export class CreateInvoiceUseCase implements ICreateInvoiceUseCase {
  private readonly logger = new Logger(CreateInvoiceUseCase.name);

  async handle(dto: CreateInvoiceDTO): Promise<InvoiceModel> {
    this.logger.log(`[handle] Creating invoice — client: ${dto.clientId}`);

    try {
      const invoice = await this.invoiceRepo.save({ ...dto });
      this.logger.log(`[handle] Invoice created — id: ${invoice.id}`);
      return invoice;
    } catch (err) {
      this.logger.error(`[handle] Failed to create invoice`, err.stack);
      throw err;
    }
  }
}
```

| Nivel | Cuándo usar |
|---|---|
| `logger.log()` | Flujo normal, operaciones exitosas |
| `logger.warn()` | Situaciones inesperadas pero recuperables |
| `logger.error()` | Errores con stack trace |
| `logger.debug()` | Solo en desarrollo, datos detallados |

---

## 11. SEGURIDAD

### Variables de entorno
- **Nunca** hardcodear credenciales, secrets o URLs de APIs externas
- Usar `@nestjs/config` con Joi validation schema para todas las env vars
- Documentar todas las variables requeridas en `env.example`

```typescript
// ✅ Correcto
const secret = this.configService.get<string>('config.jwt.secret');

// ❌ Incorrecto (hardcoded)
const secret = 'mysupersecret123';
```

### CORS
- **Nunca** usar `origin: '*'` en producción
- Configurar lista blanca desde variables de entorno

```typescript
// ✅ Correcto
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') ?? [],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
});
```

### Autenticación
- Todos los endpoints protegidos con `@UseGuards(AuthGuard('jwt'))` por defecto
- Los endpoints públicos deben ser explícitamente marcados
- Usar `RolesGuard` para autorización granular por rol

### Contraseñas
- Siempre hashear con bcryptjs (cost factor ≥ 10)
- Nunca loggear contraseñas, tokens ni datos sensibles

---

## 12. TESTING

### Estructura de tests
```
test/
├── unit/           ← Tests de use cases y domain services (mocks de repos)
├── integration/    ← Tests de repositories contra DB real (test containers)
└── e2e/            ← Tests HTTP de extremo a extremo
```

### Use case tests (mínimo requerido)
```typescript
describe('CreateInvoiceUseCase', () => {
  let useCase: CreateInvoiceUseCase;
  let invoiceRepo: jest.Mocked<IInvoiceRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CreateInvoiceUseCase,
        { provide: IInvoiceRepository, useValue: { save: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(CreateInvoiceUseCase);
    invoiceRepo = module.get(IInvoiceRepository);
  });

  it('should create an invoice successfully', async () => {
    const dto = { ... } as CreateInvoiceDTO;
    invoiceRepo.save.mockResolvedValue({ id: 'uuid', ...dto });

    const result = await useCase.handle(dto);

    expect(result.id).toBeDefined();
    expect(invoiceRepo.save).toHaveBeenCalledWith(expect.objectContaining(dto));
  });
});
```

### Cobertura mínima
- Use cases: **80%**
- Domain services: **70%**
- Controllers (e2e): caminos principales

---

## 13. MÓDULOS

### Estructura recomendada por feature
```
src/modules/invoice/
├── domain/
│   ├── models/invoice.model.ts
│   ├── ports/create-invoice.usecase.ts
│   ├── repositories/invoice.repository.ts
│   └── dtos/create-invoice.dto.ts
├── application/
│   └── create-invoice.usecase.ts
├── infrastructure/
│   ├── entities/invoice.entity.ts
│   ├── repositories/invoice.repository.ts
│   ├── controllers/invoice.controller.ts
│   └── services/
└── invoice.module.ts
```

### Barrel files (index.ts)
- Exportar todo desde `index.ts` en cada carpeta de dominio
- Facilita los imports y oculta la estructura interna

```typescript
// domain/ports/index.ts
export * from './create-invoice.usecase';
export * from './get-invoice.usecase';
export * from './cancel-invoice.usecase';
```

---

## 14. GENERACIÓN DE PDF

- Usar Puppeteer + Handlebars (patrón establecido en el workspace)
- Templates en `domain/templates/*.hbs`
- Registrar helpers de Handlebars para operaciones comunes (count, format)
- Puppeteer args para Docker: `--no-sandbox`, `--disable-gpu`, `--disable-dev-shm-usage`

---

## 15. INTEGRACIONES EXTERNAS

- Toda integración externa debe tener su **Adapter** en `infrastructure/adapters/`
- El adapter implementa un **Port** definido en `domain/adapters/`
- Nunca llamar SDKs externos directamente desde use cases

```typescript
// ✅ domain/adapters/email.adapter.ts
export abstract class IEmailAdapter {
  abstract send(params: IMailParams): Promise<void>;
}

// ✅ infrastructure/adapters/brevo.adapter.ts
@Injectable()
export class BrevoAdapter implements IEmailAdapter {
  async send(params: IMailParams): Promise<void> { ... }
}
```

---

*Instrucciones generadas a partir del análisis del workspace Vendex — tracking-trucks-api, versatil-api, asapi. Fecha: Junio 2026.*
