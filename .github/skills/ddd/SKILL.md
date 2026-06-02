# Skill: Domain Driven Design (DDD)

> Skill de DDD aplicada al workspace Vendex.
> El workspace ya tiene elementos de DDD (modelos de dominio, repositorios, servicios de dominio).
> Esta skill documenta cómo profundizar y consolidar su aplicación.

---

## CONCEPTOS CLAVE DE DDD

Domain Driven Design es una filosofía de desarrollo donde el **modelo de dominio** (el lenguaje y las reglas del negocio) es el centro de todo el diseño del software.

### Ubiquitous Language
El código debe hablar el mismo idioma que el negocio.

```typescript
// ❌ Lenguaje técnico que no refleja el dominio
class Record {
  status: number; // ¿Qué es 1? ¿Qué es 2?
  ref: string;
}

// ✅ Lenguaje del negocio
class Invoice {
  paymentType: PAYMENT_TYPE;    // CASH | CREDIT
  isActive: boolean;            // Factura activa vs cancelada
  sequence: number;             // Número de factura secuencial
  dueDate?: Date;               // Fecha de vencimiento
}
```

---

## ENTIDADES (Entities)

Una **Entidad** tiene identidad única que persiste a lo largo del tiempo, aunque sus atributos cambien.

### Características
- Tiene un `id` único (UUID en este workspace)
- Dos instancias con el mismo id son la misma entidad
- Su identidad NO depende de sus atributos

```typescript
// domain/models/invoice.model.ts
export class InvoiceModel {
  // Identidad única — dos facturas con el mismo id son la misma factura
  id: string;

  // Estado mutable
  sequence: number;
  paymentType: PAYMENT_TYPE;
  subTotal: number;
  total: number;
  vat: number;
  isActive: boolean;
  dueDate?: Date;
  comments?: string;

  // Relaciones con otras entidades
  client: ClientModel;
  company: CompanyModel;
  details: InvoiceDetailModel[];

  // Metadata de auditoría
  createdAt: Date;
  updatedAt: Date;
  createdBy?: UserModel;
  canceledBy?: UserModel;
}
```

### Entidades en el workspace Vendex
| Repositorio | Entidades encontradas |
|---|---|
| **asapi** | Invoice, Budget, Product, Company, User, Client, Supplier, Category, Purchase, Expense, Lead |
| **versatil-api** | Business, Owner, Document, Upload |
| **tracking-trucks-api** | Machine, Signal, Measurement, Comment, Operator, TrackingColor |

---

## VALUE OBJECTS (Objetos de Valor)

Un **Value Object** no tiene identidad propia. Se define enteramente por sus atributos. Dos instancias con los mismos atributos son equivalentes.

### Características
- Sin `id` propio
- Inmutables (no se modifican, se reemplazan)
- Encapsulan reglas de validación

```typescript
// ✅ Value Object: Address
export class Address {
  readonly street: string;
  readonly city: string;
  readonly department: string;
  readonly zipCode: string;

  private constructor(
    street: string,
    city: string,
    department: string,
    zipCode: string,
  ) {
    this.street = street;
    this.city = city;
    this.department = department;
    this.zipCode = zipCode;
  }

  static create(
    street: string,
    city: string,
    department: string,
    zipCode: string,
  ): Address {
    if (!street || street.trim().length === 0) {
      throw new Error('Street is required');
    }
    if (!city || city.trim().length === 0) {
      throw new Error('City is required');
    }
    return new Address(street.trim(), city.trim(), department.trim(), zipCode?.trim());
  }

  equals(other: Address): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.department === other.department
    );
  }

  toString(): string {
    return `${this.street}, ${this.city}, ${this.department}`;
  }
}

// ✅ Value Object: Money
export class Money {
  readonly amount: number;
  readonly currency: string;

  private constructor(amount: number, currency: string) {
    if (amount < 0) throw new Error('Amount cannot be negative');
    this.amount = amount;
    this.currency = currency;
  }

  static create(amount: number, currency = 'COP'): Money {
    return new Money(amount, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot add ${this.currency} and ${other.currency}`);
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}

// ✅ Value Object: TaxId (NIT/CC en el contexto colombiano)
export class TaxId {
  readonly value: string;
  readonly type: 'NIT' | 'CC';

  private constructor(value: string, type: 'NIT' | 'CC') {
    this.value = value;
    this.type = type;
  }

  static create(value: string, type: 'NIT' | 'CC'): TaxId {
    if (!value.match(/^\d{6,12}$/)) {
      throw new Error(`Invalid tax id format: ${value}`);
    }
    return new TaxId(value, type);
  }
}
```

### Value Objects implícitos en el workspace
El workspace tiene datos que deberían ser Value Objects pero hoy son strings simples:

| Dato actual | Value Object propuesto | Validación que encapsula |
|---|---|---|
| `it: string` | `TaxId` | Formato NIT/CC colombiano |
| `address: string` | `Address` | Calle, ciudad, departamento |
| `phoneNumber: string` | `PhoneNumber` | Formato (XXX)-XXX-XXXX |
| `email: string` | `Email` | Formato de email válido |
| `total: number` | `Money` | No negativo, con moneda |

---

## AGGREGATES (Agregados)

Un **Aggregate** es un grupo de entidades y value objects que forman una unidad consistente. El **Aggregate Root** es la entidad principal que controla el acceso al grupo.

### Reglas
1. Solo el Aggregate Root es accesible desde fuera del agregado
2. Los cambios al agregado solo se hacen a través del root
3. Las referencias entre agregados son por `id`, no por referencia directa
4. Un repositorio por agregado

### Agregados en el workspace Vendex (asapi)

```
Invoice (Aggregate Root)
  └── InvoiceDetail[] (dentro del mismo agregado)

Budget (Aggregate Root)
  └── BudgetDetail[] (dentro del mismo agregado)

Purchase (Aggregate Root)
  └── PurchaseDetail[] (dentro del mismo agregado)

Company (Aggregate Root)
  ├── User[] (referenciados por companyId)
  ├── Product[] (referenciados por companyId)
  ├── Supplier[] (referenciados por companyId)
  └── Client[] (referenciados por companyId)
```

```typescript
// ✅ Aggregate Root: Invoice controla sus details
export class InvoiceModel {
  id: string;
  details: InvoiceDetailModel[];  // Parte del mismo agregado

  // El agregado expone métodos de negocio
  cancel(canceledByUserId: string): void {
    if (!this.isActive) throw new ConflictException('Invoice is already canceled');
    this.isActive = false;
    this.canceledBy = canceledByUserId;
  }

  addDetail(detail: CreateInvoiceDetailDTO): void {
    // Validación de invariante del agregado
    if (this.details.length >= 50) {
      throw new BadRequestException('Invoice cannot have more than 50 items');
    }
    this.details.push(new InvoiceDetailModel(detail));
  }

  calculateTotal(): number {
    return this.details.reduce((sum, d) => sum + d.amount * d.quantity, 0);
  }
}
```

---

## DOMAIN SERVICES (Servicios de Dominio)

Los servicios de dominio contienen lógica de negocio que **no pertenece naturalmente a una sola entidad**.

### Cuándo usar un Domain Service
- La lógica involucra múltiples entidades/agregados
- La operación no es una responsabilidad natural de ninguna entidad
- La lógica sería artificial en un Value Object

```typescript
// ✅ Domain Service: cálculo de impuestos (involucra Company + Invoice + Product)
// domain/services/tax-calculator.service.ts
export abstract class ITaxCalculatorService {
  abstract calculate(invoice: InvoiceModel, company: CompanyModel): TaxBreakdown;
}

// infrastructure/services/colombian-tax-calculator.service.ts
@Injectable()
export class ColombianTaxCalculatorService implements ITaxCalculatorService {
  calculate(invoice: InvoiceModel, company: CompanyModel): TaxBreakdown {
    const vatRate = company.isVatRegistered ? 0.19 : 0;
    const vatAmount = invoice.subTotal * vatRate;
    return {
      subTotal: invoice.subTotal,
      vatRate,
      vatAmount,
      total: invoice.subTotal + vatAmount,
    };
  }
}
```

```typescript
// ✅ Domain Service: generación de número de secuencia de factura
export abstract class ISequenceService {
  abstract nextInvoiceSequence(companyId: string): Promise<number>;
  abstract nextBudgetSequence(companyId: string): Promise<number>;
}
```

### Domain Services en el workspace

| Servicio | Dónde está hoy | Qué hace |
|---|---|---|
| `ITimerService` (tracking-trucks-api) | domain/services | Calcula turno día/noche para mining |
| `IUtilService` (tracking-trucks-api) | domain/services | Chunks, parsing de fechas |
| `IEmailService` (todos) | domain/services | Abstracción de envío de email |
| `IPDFService` (todos) | domain/services | Abstracción de generación PDF |
| `IApplyService` (versatil-api) | domain/services | Orquesta PDF + email para applications |

---

## REPOSITORIES (Repositorios)

En DDD, el repositorio es una abstracción que simula una **colección en memoria** de agregados. El consumidor no sabe si los datos vienen de PostgreSQL, MongoDB o un archivo.

### Repositorio orientado al dominio
```typescript
// ✅ Repositorio con métodos del lenguaje del negocio
export abstract class IInvoiceRepository {
  abstract save(invoice: InvoiceModel): Promise<InvoiceModel>;
  abstract findById(id: string): Promise<InvoiceModel | null>;
  abstract findActiveByCompany(companyId: string): Promise<InvoiceModel[]>;
  abstract findByClientAndDateRange(
    clientId: string,
    from: Date,
    to: Date,
  ): Promise<InvoiceModel[]>;
  abstract findCanceledByUser(canceledByUserId: string): Promise<InvoiceModel[]>;
  abstract nextSequence(companyId: string): Promise<number>;
}

// ❌ Repositorio genérico sin semántica de dominio
export abstract class IInvoiceRepository {
  abstract find(options: Record<string, unknown>): Promise<unknown[]>;
  abstract findOne(options: Record<string, unknown>): Promise<unknown>;
  abstract save(doc: unknown): Promise<unknown>;
}
```

---

## DOMAIN EVENTS (Eventos de Dominio)

Los eventos de dominio representan algo significativo que **ocurrió** en el dominio. Permiten desacoplar efectos secundarios del flujo principal.

### Cuándo usar Domain Events
- Al crear una factura → notificar al cliente por email
- Al cancelar un presupuesto → liberar el inventario reservado
- Al registrar un nuevo usuario → enviar email de bienvenida

```typescript
// domain/events/invoice-created.event.ts
export class InvoiceCreatedEvent {
  constructor(
    public readonly invoiceId: string,
    public readonly clientId: string,
    public readonly companyId: string,
    public readonly total: number,
    public readonly createdAt: Date,
  ) {}
}

// En el use case — emitir evento
@Injectable()
export class CreateInvoiceUseCase implements ICreateInvoiceUseCase {
  constructor(
    private readonly invoiceRepo: IInvoiceRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(dto: CreateInvoiceDTO): Promise<InvoiceModel> {
    const invoice = await this.invoiceRepo.save({ ...dto });

    // Emitir evento — los listeners se encargan de los efectos secundarios
    this.eventEmitter.emit(
      'invoice.created',
      new InvoiceCreatedEvent(invoice.id, invoice.client.id, invoice.company.id, invoice.total, new Date()),
    );

    return invoice;
  }
}

// Listener — efecto secundario desacoplado
@Injectable()
export class InvoiceNotificationListener {
  @OnEvent('invoice.created')
  async handleInvoiceCreated(event: InvoiceCreatedEvent): Promise<void> {
    await this.emailService.sendInvoiceCreatedNotification(event);
  }
}
```

---

## BOUNDED CONTEXTS (Contextos Delimitados)

Un Bounded Context define los límites dentro de los cuales un modelo de dominio es válido y consistente.

### Bounded Contexts identificados en el workspace

```
┌─────────────────────────────────────────────────────────────────┐
│  tracking-trucks-api                                            │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  Mining BC     │  │  Signal BC   │  │  Reporting BC    │    │
│  │  (Machines,    │  │  (Real-time  │  │  (PDF, Excel,    │    │
│  │   Operators)   │  │   signals)   │  │   KML exports)   │    │
│  └────────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  asapi                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │  Sales BC  │  │ Inventory BC │  │  Financial BC        │    │
│  │ (Invoice,  │  │ (Product,    │  │  (Expense, Purchase) │    │
│  │  Budget,   │  │  Category,   │  │                      │    │
│  │  Lead)     │  │  Supplier)   │  │                      │    │
│  └────────────┘  └──────────────┘  └──────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Identity BC: User, Company, Auth                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Comunicación entre Bounded Contexts
```typescript
// ✅ Referencia entre contextos por ID (no por objeto)
export class InvoiceModel {
  companyId: string;  // ✅ Referencia al Company BC por ID
  clientId: string;   // ✅ No embeds ClientModel completo
}

// ❌ Acoplamiento entre contextos
export class InvoiceModel {
  company: CompanyModel;  // ❌ Embedde el modelo del Company BC
}
```

---

## ANTI-PATTERNS DE DDD A EVITAR

### Anemic Domain Model
```typescript
// ❌ Modelo anémico — solo datos, sin comportamiento
export class InvoiceModel {
  id: string;
  isActive: boolean;
  canceledBy: string;
  // Sin métodos de dominio
}

// La lógica vive dispersa en services/use cases
if (invoice.isActive && !invoice.canceledBy) {
  invoice.isActive = false;
  invoice.canceledBy = userId;
  await this.repo.save(invoice);
}

// ✅ Modelo rico — encapsula comportamiento
export class InvoiceModel {
  cancel(userId: string): void {
    if (!this.isActive) throw new ConflictException('Already canceled');
    this.isActive = false;
    this.canceledBy = userId;
  }
}
```

### God Repository
```typescript
// ❌ Repositorio con métodos que no pertenecen al agregado
abstract class IInvoiceRepository {
  abstract getInvoiceWithClientAndCompanyAndProductsAndSuppliersAndPayments(...): Promise<...>
  abstract getDashboardStats(): Promise<DashboardStats>   // No es responsabilidad del repo
  abstract sendEmailAfterSave(invoice: InvoiceModel): Promise<void>  // ¡Efecto secundario en repo!
}
```

---

*Skill generada a partir del análisis del workspace Vendex — Junio 2026.*
