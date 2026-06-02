# Skill: Clean Code

> Skill de Clean Code aplicada al workspace Vendex (NestJS + TypeScript).
> Principios de Robert C. Martin adaptados al contexto real del codebase.

---

## NAMING — El código debe leerse como prosa

### Reglas de nomenclatura

#### Variables
```typescript
// ✅ Nombres que revelan intención
const daysSinceLastContact = 14;
const isInvoiceActive = invoice.isActive;
const totalWithVat = subTotal * (1 + VAT_RATE);

// ❌ Nombres sin significado
const d = 14;
const flag = invoice.isActive;
const t = subTotal * 1.19;

// ✅ Booleans: usar prefijos is/has/can/should
const isActive = true;
const hasPermission = user.role === USER_ROLES.ADMIN;
const canCancel = invoice.isActive && !invoice.canceledBy;

// ❌ Booleans ambiguos
const active = true;
const permission = user.role === USER_ROLES.ADMIN;
```

#### Funciones y métodos
```typescript
// ✅ Verbos que describen acción + objeto
async createInvoice(dto: CreateInvoiceDTO): Promise<InvoiceModel>
async cancelInvoiceById(id: string): Promise<void>
async findActiveInvoicesByCompany(companyId: string): Promise<InvoiceModel[]>
async sendInvoiceByEmail(invoiceId: string, email: string): Promise<void>
calculateTotalWithVat(subTotal: number, vatRate: number): number

// ❌ Nombres vagos o abreviados
async process(d: any)
async get(id: string)
async send(x: string, y: string)
```

#### Clases
```typescript
// ✅ Sustantivos que describen responsabilidad única
class InvoiceRepository
class CreateInvoiceUseCase
class EmailService
class BraintreePaymentAdapter

// ❌ Nombres genéricos o con demasiada responsabilidad
class Manager
class Processor
class Handler
class Utils           // ← demasiado amplio, dividir en responsabilidades
class InvoiceHelper
```

#### Constantes
```typescript
// ✅ UPPER_SNAKE_CASE con contexto
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const JWT_EXPIRATION_HOURS = 24;
const BREVO_INVOICE_TEMPLATE_ID = 3;

// ❌ Números mágicos sin nombre
const limit = 10485760;
const exp = 24;
```

---

## FUNCTIONS — Pequeñas, con una sola responsabilidad

### Principio de responsabilidad única (SRP)
```typescript
// ❌ Función que hace demasiado
async createInvoiceAndSendEmailAndUpdateStock(dto: CreateInvoiceDTO) {
  // Crea factura, actualiza stock, genera PDF, envía email...
  // 80 líneas de código...
}

// ✅ Funciones pequeñas con responsabilidad única
async handle(dto: CreateInvoiceDTO): Promise<InvoiceModel> {
  await this.validateInvoiceData(dto);
  const invoice = await this.persistInvoice(dto);
  await this.updateProductStock(dto.details);
  await this.notifyClient(invoice);
  return invoice;
}

private async validateInvoiceData(dto: CreateInvoiceDTO): Promise<void> {
  const client = await this.clientRepo.findOne({ where: { id: dto.clientId } });
  if (!client) throw new NotFoundException(`Client ${dto.clientId} not found`);
}

private async persistInvoice(dto: CreateInvoiceDTO): Promise<InvoiceModel> {
  return this.invoiceRepo.save({ ...dto, isActive: true });
}
```

### Máximo de argumentos
```typescript
// ✅ Máximo 3 argumentos; si hay más, usar un objeto
async sendEmail(params: IMailParams): Promise<void>

// ❌ Demasiados argumentos posicionales
async sendEmail(
  to: string,
  subject: string,
  body: string,
  from: string,
  templateId: number,
  variables: Record<string, string>
): Promise<void>
```

### Sin efectos secundarios ocultos
```typescript
// ❌ Efecto secundario oculto: el nombre no indica que también actualiza
async getUser(id: string): Promise<UserModel> {
  const user = await this.userRepo.findOne({ where: { id } });
  user.lastLoginAt = new Date();  // ← efecto secundario no esperado
  await this.userRepo.save(user);
  return user;
}

// ✅ Separar responsabilidades
async findUser(id: string): Promise<UserModel> {
  return this.userRepo.findOne({ where: { id } });
}

async recordLogin(userId: string): Promise<void> {
  await this.userRepo.updateOne(
    { id: userId },
    { lastLoginAt: new Date() },
  );
}
```

### Evitar flags como parámetros
```typescript
// ❌ Flag que cambia el comportamiento de la función
async getInvoices(companyId: string, includeInactive: boolean) {
  if (includeInactive) {
    return this.invoiceRepo.find({ where: { company: companyId } });
  }
  return this.invoiceRepo.find({ where: { company: companyId, isActive: true } });
}

// ✅ Dos funciones separadas
async getActiveInvoices(companyId: string): Promise<InvoiceModel[]>
async getAllInvoices(companyId: string): Promise<InvoiceModel[]>
```

---

## CLASSES — SOLID en la práctica

### Single Responsibility Principle
```typescript
// ❌ Clase con múltiples responsabilidades
class UserService {
  async createUser(dto: CreateUserDTO) { /* ... */ }
  async authenticate(email: string, password: string) { /* ... */ }
  async sendWelcomeEmail(user: UserModel) { /* ... */ }
  async generatePdfReport(userId: string) { /* ... */ }
  async uploadAvatar(userId: string, file: Buffer) { /* ... */ }
}

// ✅ Responsabilidades separadas
class CreateUserUseCase { async handle(dto: CreateUserDTO) }
class AuthenticateUserUseCase { async handle(email: string, password: string) }
class EmailService { async sendWelcome(user: UserModel) }
class PdfService { async generateUserReport(userId: string) }
class StorageService { async uploadAvatar(userId: string, file: Buffer) }
```

### Open/Closed Principle
```typescript
// ✅ Extendible sin modificar — usar abstract + implementaciones
abstract class IPaymentAdapter {
  abstract charge(amount: number, currency: string): Promise<string>;
}

class StripeAdapter implements IPaymentAdapter { /* ... */ }
class PayuAdapter implements IPaymentAdapter { /* ... */ }
class CashPaymentAdapter implements IPaymentAdapter { /* ... */ }

// Agregar un nuevo proveedor no requiere modificar el use case
@Injectable()
export class CreateInvoiceUseCase {
  constructor(private readonly payment: IPaymentAdapter) {}
}
```

### Dependency Inversion Principle
```typescript
// ❌ Depende de implementación concreta
class CreateInvoiceUseCase {
  constructor(private readonly repo: TypeOrmInvoiceRepository) {}
}

// ✅ Depende de abstracción
class CreateInvoiceUseCase {
  constructor(private readonly repo: IInvoiceRepository) {}
}
```

---

## ERROR HANDLING

### Jerarquía de excepciones
```typescript
// ✅ Excepciones específicas con mensaje informativo
throw new NotFoundException(`Invoice with id "${id}" not found`);
throw new ConflictException(`Invoice #${sequence} is already canceled`);
throw new BadRequestException(`Payment type "${paymentType}" is not valid`);
throw new ForbiddenException(`User "${userId}" cannot access company "${companyId}" resources`);
throw new UnauthorizedException('Token expired or invalid');
```

### Nunca silenciar errores
```typescript
// ❌ Error silenciado
try {
  await this.emailService.send(params);
} catch {
  // silencio total — nadie sabe qué pasó
}

// ❌ Solo loggear sin re-lanzar (cuando el error debe propagarse)
try {
  await this.emailService.send(params);
} catch (err) {
  console.log('Error:', err);
  // continúa como si nada — el caller no sabe que falló
}

// ✅ Loggear + re-lanzar o transformar
try {
  await this.emailService.send(params);
} catch (err) {
  this.logger.error(`Failed to send invoice email to ${params.to[0].email}`, err.stack);
  throw new InternalServerErrorException('Failed to deliver invoice notification');
}
```

### Fail fast
```typescript
// ✅ Validar precondiciones al inicio de la función
async handle(id: string): Promise<InvoiceModel> {
  // Validar primero, procesar después
  const invoice = await this.invoiceRepo.findOne({ where: { id } });
  if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
  if (!invoice.isActive) throw new ConflictException(`Invoice ${id} is already canceled`);

  // Lógica principal solo si las precondiciones son válidas
  return invoice;
}
```

---

## READABILITY

### Evitar comentarios que explican código obvio
```typescript
// ❌ Comentario redundante
// Busca el usuario por id
const user = await this.userRepo.findOne({ where: { id } });

// ❌ Código comentado (eliminarlo)
// const oldLogic = doSomething(x);
const newLogic = doSomethingBetter(x);

// ✅ Comentar el "por qué", no el "qué"
// Puppeteer requiere --no-sandbox en entornos Docker/CI
// Ver: https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md
const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
```

### Early return sobre anidamiento profundo
```typescript
// ❌ Arrow anti-pattern (anidamiento profundo)
async handle(id: string): Promise<void> {
  const invoice = await this.repo.findOne({ where: { id } });
  if (invoice) {
    if (invoice.isActive) {
      if (!invoice.canceledBy) {
        await this.repo.save({ ...invoice, isActive: false });
        await this.emailService.send({ ... });
      } else {
        throw new ConflictException('Already canceled');
      }
    } else {
      throw new ConflictException('Invoice is not active');
    }
  } else {
    throw new NotFoundException('Not found');
  }
}

// ✅ Early return — flat is better than nested
async handle(id: string): Promise<void> {
  const invoice = await this.repo.findOne({ where: { id } });
  if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
  if (!invoice.isActive) throw new ConflictException(`Invoice ${id} is not active`);
  if (invoice.canceledBy) throw new ConflictException(`Invoice ${id} is already canceled`);

  await this.repo.save({ ...invoice, isActive: false });
  await this.emailService.send({ /* ... */ });
}
```

### Expresividad sobre brevedad
```typescript
// ❌ Compacto pero críptico
const r = items.filter(i => i.a).map(i => ({ ...i, t: i.p * i.q * (1 - i.d / 100) }));

// ✅ Legible
const activeItems = items.filter((item) => item.isActive);
const itemsWithTotal = activeItems.map((item) => ({
  ...item,
  total: item.price * item.quantity * (1 - item.discountPercent / 100),
}));
```

### Magic numbers → constantes nombradas
```typescript
// ❌ Números mágicos
if (file.size > 10485760) { throw new Error('Too large'); }
const hash = await bcrypt.hash(password, 10);
const token = jwt.sign(payload, secret, { expiresIn: 86400 });

// ✅ Constantes con nombre
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const BCRYPT_SALT_ROUNDS = 10;
const JWT_EXPIRATION_SECONDS = 24 * 60 * 60; // 24h

if (file.size > MAX_FILE_SIZE_BYTES) { throw new PayloadTooLargeException('File exceeds 10MB'); }
const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
const token = jwt.sign(payload, secret, { expiresIn: JWT_EXPIRATION_SECONDS });
```

---

## TYPESCRIPT ESPECÍFICO

### Tipos explícitos en métodos públicos
```typescript
// ✅ Siempre declarar tipos en métodos públicos
async handle(dto: CreateInvoiceDTO): Promise<InvoiceModel> { }
async findAll(companyId: string): Promise<InvoiceModel[]> { }
calculateTotal(items: InvoiceDetailModel[]): number { }

// ❌ Sin tipos de retorno (el compilador puede inferirlos, pero reduce legibilidad)
async handle(dto) { }
async findAll(companyId) { }
```

### Evitar `any`
```typescript
// ❌ Evitar any
async rawQuery(sql: string, params: any[]): Promise<any[]>
function parseResponse(data: any): any

// ✅ Usar unknown para datos no tipados, luego hacer type narrowing
async rawQuery(sql: string, params: unknown[]): Promise<unknown[]>
function parseResponse<T>(data: unknown): T {
  return data as T; // Acceptable cuando se conoce el contrato
}

// ✅ Usar tipos genéricos
async findOne<T>(options: FindOneOptions<T>): Promise<T | null>
```

### Optional chaining y nullish coalescing
```typescript
// ✅ Usar optional chaining
const companyName = user?.company?.name ?? 'Unknown';
const firstItem = invoice?.details?.[0];

// ❌ Verificaciones manuales verbosas
const companyName = user && user.company && user.company.name ? user.company.name : 'Unknown';
```

### Type assertions controladas
```typescript
// ✅ Type assertions solo cuando necesario y justificado
const user = request.user as UserModel;

// ✅ Non-null assertion solo cuando se sabe que no puede ser null
const companyId = user.company!.id; // Solo si hemos verificado que company existe

// ❌ Usar ! sin verificación previa
const companyId = user.company!.id; // Peligroso si company puede ser null
```

---

## MÉTRICAS DE CALIDAD

| Métrica | Límite recomendado | Razón |
|---|---|---|
| Líneas por función/método | ≤ 30 | Fácil de entender en una pantalla |
| Argumentos por función | ≤ 3 | Más reduce legibilidad del call site |
| Profundidad de anidamiento | ≤ 3 | Más requiere early returns |
| Líneas por clase | ≤ 200 | Si tiene más, evaluar dividir |
| Líneas por archivo | ≤ 300 | Si tiene más, evaluar dividir |
| Complejidad ciclomática | ≤ 10 | Indicador de testabilidad |

---

*Skill generada a partir del análisis del workspace Vendex — Junio 2026.*
