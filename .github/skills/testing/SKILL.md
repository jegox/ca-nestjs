# Skill: Testing — Unit, Integration, E2E, Mocking

> Skill de Testing para el workspace Vendex (NestJS + TypeScript + Jest).
> El workspace actualmente tiene testing mínimo. Esta skill establece la estrategia completa.

---

## PIRÁMIDE DE TESTING

```
           /\
          /  \
         / E2E \         ← Pocos, lentos, caros — caminos principales
        /________\
       /          \
      / Integration \    ← Repositorios contra DB real (Test Containers)
     /______________\
    /                \
   /   Unit Tests     \  ← Muchos, rápidos, baratos — Use cases + Services
  /____________________\
```

### Distribución recomendada
- **Unit Tests (70%)** — Use cases, domain services, mappers, utilities
- **Integration Tests (20%)** — Repositorios, servicios externos con mocks
- **E2E Tests (10%)** — Flujos críticos de negocio via HTTP

---

## CONFIGURACIÓN

### jest.config.ts (proyecto)
```typescript
// jest.config.ts
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!**/main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/domain/$1',
    '^@infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@usecases/(.*)$': '<rootDir>/usecases/$1',
  },
};
```

### jest-e2e.json (e2e)
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": {
    "^@domain/(.*)$": "<rootDir>/../src/domain/$1",
    "^@infrastructure/(.*)$": "<rootDir>/../src/infrastructure/$1"
  }
}
```

### Cobertura mínima
```typescript
// package.json
{
  "jest": {
    "coverageThresholds": {
      "global": {
        "branches": 70,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

---

## UNIT TESTS — Use Cases

Los use cases son los candidatos principales para unit tests porque tienen lógica de orquestación testeable con mocks.

### Estructura de un test de use case
```typescript
// test/unit/usecases/invoice/create-invoice.usecase.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateInvoiceUseCase } from '@usecases/invoice/create-invoice.usecase';
import { IInvoiceRepository } from '@domain/repositories';
import { IProductRepository } from '@domain/repositories';
import { IClientRepository } from '@domain/repositories';

describe('CreateInvoiceUseCase', () => {
  let useCase: CreateInvoiceUseCase;
  let invoiceRepo: jest.Mocked<IInvoiceRepository>;
  let productRepo: jest.Mocked<IProductRepository>;
  let clientRepo: jest.Mocked<IClientRepository>;

  // ✅ Mocks tipados con jest.Mocked<T>
  const mockInvoiceRepo = (): jest.Mocked<IInvoiceRepository> => ({
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findActiveByCompany: jest.fn(),
    paginate: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    rawQuery: jest.fn(),
    nextSequence: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateInvoiceUseCase,
        { provide: IInvoiceRepository, useValue: mockInvoiceRepo() },
        { provide: IProductRepository, useValue: { findOne: jest.fn() } },
        { provide: IClientRepository, useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(CreateInvoiceUseCase);
    invoiceRepo = module.get(IInvoiceRepository);
    productRepo = module.get(IProductRepository);
    clientRepo = module.get(IClientRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle()', () => {
    const validDto: CreateInvoiceDTO = {
      clientId: 'client-uuid',
      paymentType: PAYMENT_TYPE.CASH,
      subTotal: 1000,
      total: 1190,
      vat: 190,
      details: [{ productId: 'product-uuid', quantity: 2, amount: 500 }],
    };

    it('should create an invoice successfully', async () => {
      // Arrange
      const mockClient = { id: 'client-uuid', name: 'Test Client' } as ClientModel;
      const mockProduct = { id: 'product-uuid', stock: 10, price: 500 } as ProductModel;
      const mockInvoice = { id: 'invoice-uuid', ...validDto, isActive: true } as InvoiceModel;

      clientRepo.findOne.mockResolvedValue(mockClient);
      productRepo.findOne.mockResolvedValue(mockProduct);
      invoiceRepo.save.mockResolvedValue(mockInvoice);

      // Act
      const result = await useCase.handle(validDto);

      // Assert
      expect(result.id).toBe('invoice-uuid');
      expect(invoiceRepo.save).toHaveBeenCalledTimes(1);
      expect(invoiceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-uuid', isActive: true }),
      );
    });

    it('should throw NotFoundException when client does not exist', async () => {
      // Arrange
      clientRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.handle(validDto)).rejects.toThrow(NotFoundException);
      expect(invoiceRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when product has insufficient stock', async () => {
      // Arrange
      const mockClient = { id: 'client-uuid' } as ClientModel;
      const mockProduct = { id: 'product-uuid', stock: 1 } as ProductModel; // stock < quantity(2)

      clientRepo.findOne.mockResolvedValue(mockClient);
      productRepo.findOne.mockResolvedValue(mockProduct);

      // Act & Assert
      await expect(useCase.handle(validDto)).rejects.toThrow(BadRequestException);
    });
  });
});
```

### Patrón AAA (Arrange, Act, Assert)
```typescript
it('should cancel an invoice', async () => {
  // ARRANGE — preparar estado inicial y mocks
  const invoiceId = 'test-uuid';
  const userId = 'user-uuid';
  const activeInvoice = { id: invoiceId, isActive: true, canceledBy: null } as InvoiceModel;
  invoiceRepo.findById.mockResolvedValue(activeInvoice);
  invoiceRepo.save.mockResolvedValue({ ...activeInvoice, isActive: false });

  // ACT — ejecutar la acción bajo prueba
  await useCase.handle(invoiceId, userId);

  // ASSERT — verificar el resultado
  expect(invoiceRepo.save).toHaveBeenCalledWith(
    expect.objectContaining({ isActive: false, canceledBy: userId }),
  );
});
```

---

## UNIT TESTS — Domain Services

```typescript
// test/unit/services/timer.service.spec.ts
describe('TimerService', () => {
  let service: TimerService;

  beforeEach(() => {
    service = new TimerService(); // Sin DI — servicio puro
  });

  describe('getCurrentShift()', () => {
    it('should return DAY shift at 10:00 AM', () => {
      // Arrange
      const date = new Date('2026-06-02T10:00:00');

      // Act
      const shift = service.getCurrentShift(date);

      // Assert
      expect(shift.type).toBe('day');
      expect(shift.from).toBe(/* 6am timestamp */);
    });

    it('should return NIGHT shift at 2:00 AM', () => {
      const date = new Date('2026-06-02T02:00:00');
      const shift = service.getCurrentShift(date);
      expect(shift.type).toBe('night');
    });
  });
});
```

---

## UNIT TESTS — Mappers

```typescript
// test/unit/mappers/proemion.mapper.spec.ts
describe('ProemionMapper', () => {
  let mapper: ProemionMapper;

  beforeEach(() => {
    mapper = new ProemionMapper();
  });

  describe('conexion()', () => {
    it('should map machine info to connection response', () => {
      // Arrange
      const machineInfo: IMachineInfo[] = [{
        id: 'machine-1',
        name: 'Machine Alpha',
        activity: {
          lastContactAt: '2026-06-02T10:00:00Z',
          lastDatapointAt: '2026-06-02T09:58:00Z',
        },
      }];

      // Act
      const result = mapper.conexion(machineInfo);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('machine-1');
      expect(result[0].activity.lastContactAt).toMatch(/\d{2}\/\d{2}\/\d{4}/); // Formato de fecha
    });
  });
});
```

---

## INTEGRATION TESTS — Repositories

Los tests de integración validan que los repositorios funcionan correctamente con la base de datos real (usando Test Containers o SQLite in-memory).

```typescript
// test/integration/repositories/invoice.repository.spec.ts
describe('InvoiceRepository (Integration)', () => {
  let module: TestingModule;
  let repo: InvoiceRepository;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',          // SQLite en memoria para tests
          database: ':memory:',
          entities: [Invoice, InvoiceDetail, Client, Company],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Invoice, InvoiceDetail]),
      ],
      providers: [
        { provide: IInvoiceRepository, useClass: InvoiceRepository },
      ],
    }).compile();

    repo = module.get(IInvoiceRepository);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should save and find an invoice', async () => {
    // Arrange
    const invoice = await repo.create();
    invoice.total = 1190;
    invoice.isActive = true;

    // Act
    const saved = await repo.save(invoice);
    const found = await repo.findById(saved.id);

    // Assert
    expect(found).toBeDefined();
    expect(found!.total).toBe(1190);
  });
});
```

---

## E2E TESTS — HTTP Endpoints

```typescript
// test/e2e/invoice.e2e-spec.ts
import * as request from 'supertest';

describe('Invoice (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Aplicar misma configuración que main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    // Login para obtener token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });

    authToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/invoice', () => {
    it('should create an invoice successfully', async () => {
      const dto = {
        clientId: 'existing-client-id',
        paymentType: 'CASH',
        subTotal: 1000,
        total: 1190,
        vat: 190,
        details: [{ productId: 'existing-product-id', quantity: 1, amount: 1000 }],
      };

      const response = await request(app.getHttpServer())
        .post('/api/invoice')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      expect(response.body.status).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/invoice')
        .send({})
        .expect(401);
    });

    it('should return 400 with invalid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/invoice')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ clientId: 'not-a-uuid' })
        .expect(400);

      expect(response.body.status).toBe(false);
    });
  });
});
```

---

## MOCKING — Patrones

### Mock de repositorios
```typescript
// test/helpers/mock-repositories.ts

// ✅ Factory function para mocks reutilizables
export const createMockInvoiceRepository = (): jest.Mocked<IInvoiceRepository> => ({
  save: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  findActiveByCompany: jest.fn(),
  paginate: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(),
  rawQuery: jest.fn(),
  nextSequence: jest.fn(),
});

// Uso en tests
const invoiceRepo = createMockInvoiceRepository();
invoiceRepo.findById.mockResolvedValue(mockInvoice);
invoiceRepo.save.mockRejectedValue(new Error('DB connection failed'));
```

### Mock de servicios externos
```typescript
// ✅ Mock de EmailService
const mockEmailService: jest.Mocked<IEmailService> = {
  send: jest.fn().mockResolvedValue(undefined),
};

// ✅ Mock de configuración
const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    const config = { JWT_SECRET: 'test-secret', PORT: 3000 };
    return config[key];
  }),
};

// ✅ Spy sobre método específico (no mock completo)
const sendSpy = jest.spyOn(emailService, 'send').mockResolvedValue(undefined);
expect(sendSpy).toHaveBeenCalledWith(
  expect.objectContaining({ to: [{ email: 'test@test.com' }] }),
);
```

### Mock de módulos externos (Puppeteer, S3)
```typescript
// ✅ Mock global del módulo (en jest.setup.ts)
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
    }),
    close: jest.fn(),
  }),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ ETag: 'test-etag' }),
  })),
  PutObjectCommand: jest.fn(),
}));
```

---

## TESTING DE GUARDS Y PIPES

```typescript
// test/unit/guards/roles.guard.spec.ts
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when user has required role', () => {
    const context = createMockExecutionContext({
      user: { role: USER_ROLES.ADMIN },
      handlerRoles: [USER_ROLES.ADMIN],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user lacks required role', () => {
    const context = createMockExecutionContext({
      user: { role: USER_ROLES.CASHIER },
      handlerRoles: [USER_ROLES.ADMIN],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

// Helper para crear mock de ExecutionContext
function createMockExecutionContext(opts: { user: Partial<UserModel>; handlerRoles: USER_ROLES[] }) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: opts.user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}
```

---

## ESTRUCTURA DE ARCHIVOS DE TESTS

```
test/
├── unit/
│   ├── usecases/
│   │   ├── invoice/
│   │   │   ├── create-invoice.usecase.spec.ts
│   │   │   ├── cancel-invoice.usecase.spec.ts
│   │   │   └── get-invoices.usecase.spec.ts
│   │   └── user/
│   │       └── create-user.usecase.spec.ts
│   ├── services/
│   │   ├── timer.service.spec.ts
│   │   └── utility.service.spec.ts
│   ├── guards/
│   │   └── roles.guard.spec.ts
│   └── mappers/
│       └── proemion.mapper.spec.ts
├── integration/
│   └── repositories/
│       ├── invoice.repository.spec.ts
│       └── user.repository.spec.ts
└── e2e/
    ├── auth.e2e-spec.ts
    ├── invoice.e2e-spec.ts
    └── user.e2e-spec.ts
```

---

## COMANDOS DE TESTING

```bash
# Unit tests
npm run test

# Unit tests en watch mode (desarrollo)
npm run test:watch

# Con cobertura
npm run test:cov

# E2E tests
npm run test:e2e

# Test específico
npx jest create-invoice.usecase.spec.ts

# Test con verbose
npx jest --verbose

# Test con coverage solo de un archivo
npx jest --coverage --collectCoverageFrom='src/usecases/**/*.ts'
```

---

## QUICK WINS (mejoras inmediatas)

Para los tres repositorios del workspace, las primeras pruebas que agregar son:

1. **Use cases críticos** — `CreateInvoiceUseCase`, `AuthUseCase`, `ApplyUseCase`
2. **Domain services** — `TimerService`, `UtilityService`
3. **Guards** — `RolesGuard`, `AdminGuard`
4. **E2E smoke** — `POST /auth/login`, `GET /health`

Estas 10-15 pruebas darían una red de seguridad básica sin gran inversión.

---

*Skill generada a partir del análisis del workspace Vendex — Junio 2026.*
