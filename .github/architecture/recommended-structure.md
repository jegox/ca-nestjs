# Recommended Structure — Workspace Vendex

> Comparación entre la estructura actual encontrada en el workspace y la estructura recomendada.
> NO se propone mover archivos todavía — este documento es una guía para nuevos features y futuras migraciones.

---

## ESTRUCTURA ACTUAL

### tracking-trucks-api

```
src/
├── main.ts
├── domain/
│   ├── adapters/               ← IProemionAdapter (abstract)
│   │   ├── index.ts
│   │   └── proemion.adapter.ts
│   ├── assets/                 ← Constantes de colores/señales, operadores, emails
│   │   ├── index.ts
│   │   ├── operators.ts
│   │   └── user-email.ts
│   ├── constants/              ← Constante ModelId
│   │   └── index.ts
│   ├── dtos/                   ← DTOs de request/response
│   │   └── auth/ machine/ signal/ report/ operator/ comment/
│   ├── enums/                  ← mine, user, signal, events
│   ├── interfaces/             ← proemion-response/, mail, timer, etc.
│   ├── mappers/                ← IProemionMapper, ISignalMapper (abstract)
│   ├── models/                 ← MachineModel, SignalModel, UserModel, etc.
│   ├── ports/                  ← 15 abstract use case contracts
│   ├── repositories/           ← IBaseRepository + 8 abstract repos
│   ├── services/               ← IEmailService, IProemionService, IPDFService, etc.
│   └── templates/              ← Handlebars templates para reportes
├── infrastructure/
│   ├── adapters/               ← ProemionAdapter (OAuth2 + Axios)
│   ├── config/                 ← config.ts (registerAs), validation-schema.ts
│   ├── controllers/            ← AuthController, MachineController, SignalController,
│   │                             ReportController, OperatorController, CommentController,
│   │                             UserController, CronJobController
│   ├── entities/               ← Users, Machines, Signal, Comments, etc. (TypeORM MongoDB)
│   ├── guards/                 ← AdminGuard
│   ├── mappers/                ← ProemionMapper, SignalMapper
│   ├── modules/                ← AppModule
│   ├── repositories/           ← BaseRepository + 8 implementaciones
│   ├── services/               ← ProemionService, MachineService, EmailService,
│   │                             TimerService, PDFService, UtilService, ScheduleService
│   └── strategies/             ← LocalStrategy, JwtStrategy
└── usecase/
    ├── auth.usecase.ts
    ├── comment/
    ├── cron-job/               ← ColorTracking, SaveSignals, SaveMachines, SendShiftReports
    ├── machine/
    ├── operator/
    ├── report/                 ← ReportXlsx, ReportPdf, ResumeReport
    ├── signal/                 ← RealtimeSignals, SignalTank, GridTank, TrackingByTank
    └── user/
```

### versatil-api

```
src/
├── main.ts
├── domain/
│   ├── dtos/                   ← apply-now/, forms/
│   ├── enums/                  ← brevo-template, error, form
│   ├── interfaces/             ← email, pagination, document.type, uploaded
│   ├── models/                 ← BusinessModel, OwnerModel, DocumentModel, UploadModel
│   ├── ports/                  ← 7 abstract use case ports
│   ├── repositories/           ← IBaseRepository + IBusinessRepository, IOwnerRepository,
│   │                             IDocumentRepository, IUploadRepository
│   ├── services/               ← IApplyService, IEmailService, IStorageFileService, IPDFGeneratorService
│   └── templates/              ← Handlebars templates
├── infrastructure/
│   ├── config/                 ← config.ts, validation-schema.ts
│   ├── controllers/            ← AppController (webhooks), ApplyController, UploadController
│   │   └── ⚠️ upload.controlle.ts  ← TYPO en nombre de archivo
│   ├── entities/               ← Business, Owner, Document, Upload (TypeORM PostgreSQL)
│   ├── modules/                ← AppModule, CoreModule, ApplyModule, UploadModule
│   ├── pipes/                  ← ParseBodyPipe, FileTypeValidationPipe
│   ├── repositories/           ← BaseRepository + 4 implementaciones
│   └── services/               ← EmailService, PDFGeneratorService, StorageFileService, ApplyService
└── usecases/
    ├── apply.usecase.ts        ← REQUEST scope (transacciones)
    ├── apply-id.usecase.ts
    ├── apply-pdf.usecase.ts
    ├── apply-update.usecase.ts
    ├── generate-link.usecase.ts
    ├── referal.usecase.ts
    └── upload.usecase.ts
```

### asapi

```
src/
├── main.ts
├── domain/
│   ├── constants/              ← codes.ts (geografía colombiana), userFields
│   ├── dtos/                   ← pagination, auth, user, invoice, budget, product,
│   │                             supplier, customer, company, purchase, expense, lead
│   ├── enums/                  ← role, user, error-code, company, payment-type,
│   │                             payment-source, product, event
│   ├── interfaces/             ← pagination IPagination<T>
│   ├── models/                 ← 13 modelos: User, Company, Invoice, Budget, Product,
│   │                             Supplier, Client, Category, Purchase, Expense, Lead, etc.
│   ├── ports/                  ← 40+ abstract ports por use case
│   ├── repositories/           ← IBaseRepository + 14 repos abstractos
│   └── services/               ← ISystemService, UtilityService (concreta aquí ⚠️)
├── infrastructure/
│   ├── config/                 ← environment.ts, validation-schema.ts
│   ├── controllers/            ← 13 controllers (Auth, User, Invoice, Budget, Product,
│   │                             Supplier, Customer, Company, Purchase, Expense,
│   │                             Lead, ThirdPerson, Category)
│   ├── entities/               ← 15 entities TypeORM PostgreSQL (con CommonFields base)
│   ├── guards/                 ← RolesGuard ⚠️ (declarado pero no siempre aplicado)
│   ├── interceptors/           ← ErrorsInterceptor, ResponseInterceptor (registrados globalmente)
│   ├── middleware/             ← GlobalMiddleware (request logging)
│   ├── modules/                ← AppModule (⚠️ God Module: 650+ líneas, 50+ providers)
│   ├── repositories/           ← BaseRepository + 15 implementaciones
│   ├── services/               ← SystemService, UtilityService, PdfService, EInvoiceService
│   │                             ⚠️ einvoice.service.ts incompleto con TODOs
│   ├── strategies/             ← LocalStrategy, JwtStrategy
│   └── swagger/                ← SwaggerMockup setup
└── usecases/
    ├── authentication/         ← AuthUseCase (genera JWT), RequestUseCase
    ├── budget/                 ← 5 use cases
    ├── category/               ← 5 use cases
    ├── company/                ← 2 use cases
    ├── customer/               ← 5 use cases
    ├── expense/                ← 3 use cases
    ├── invoice/                ← 6 use cases (incluyendo PDF generation)
    ├── lead/                   ← 5 use cases
    ├── product/                ← 5 use cases
    ├── purchase/               ← 4 use cases
    ├── supplier/               ← 5 use cases
    ├── thirdperson/            ← use cases
    └── user/                   ← 6 use cases
```

---

## PROBLEMAS DETECTADOS

### 🔴 Críticos

| #   | Problema                                        | Repo         | Ubicación                              |
| --- | ----------------------------------------------- | ------------ | -------------------------------------- |
| C1  | God Module con 50+ providers en un solo archivo | asapi        | `infrastructure/modules/app.module.ts` |
| C2  | Todos los endpoints sin protección JWT activa   | versatil-api | `infrastructure/controllers/`          |
| C3  | Credenciales hardcodeadas en docker-compose     | asapi        | `docker-compose.yml`                   |
| C4  | CORS `origin: '*'` en producción                | todos        | `main.ts`                              |

### 🟠 Altos

| #   | Problema                                           | Repo  | Ubicación             |
| --- | -------------------------------------------------- | ----- | --------------------- |
| A1  | TypeScript no estricto (`strictNullChecks: false`) | todos | `tsconfig.json`       |
| A2  | `console.log` en lugar de NestJS Logger            | todos | Múltiples services    |
| A3  | Sin tests unitarios ni de integración              | todos | `test/`               |
| A4  | Guards `RolesGuard` declarados pero comentados     | asapi | controllers           |
| A5  | E-Invoice service con TODOs sin completar          | asapi | `einvoice.service.ts` |

### 🟡 Medios

| #   | Problema                                        | Repo         | Ubicación          |
| --- | ----------------------------------------------- | ------------ | ------------------ |
| M1  | Typo en filename `upload.controlle.ts`          | versatil-api | `controllers/`     |
| M2  | NestJS v8 (desactualizado) en asapi             | asapi        | `package.json`     |
| M3  | Falta separar feature modules en asapi          | asapi        | arquitectura       |
| M4  | `UtilityService` concreto en `domain/services/` | asapi        | `domain/services/` |
| M5  | `ParseBodyPipe` comentado sin eliminar          | versatil-api | `main.ts`          |

---

## ESTRUCTURA RECOMENDADA

### Principio de organización

**Feature-based modules** combinados con la estructura hexagonal actual:

```
src/
├── main.ts                          ← Bootstrap (sin cambios en lógica)
├── app.module.ts                    ← Solo importa feature modules
├── shared/
│   ├── domain/
│   │   ├── models/
│   │   │   └── base.model.ts        ← id, createdAt, updatedAt
│   │   ├── repositories/
│   │   │   └── base.repository.ts   ← IBaseRepository<T>
│   │   ├── dtos/
│   │   │   └── pagination.dto.ts    ← PaginationDTO reutilizable
│   │   └── interfaces/
│   │       └── pagination.interface.ts
│   └── infrastructure/
│       ├── repositories/
│       │   └── base.repository.ts   ← BaseRepository<T> TypeORM
│       ├── interceptors/
│       │   ├── response.interceptor.ts
│       │   └── errors.interceptor.ts
│       ├── guards/
│       │   └── roles.guard.ts
│       ├── pipes/
│       │   └── file-validation.pipe.ts
│       └── middleware/
│           └── global.middleware.ts
│
├── modules/
│   ├── auth/
│   │   ├── domain/
│   │   │   ├── ports/
│   │   │   │   └── auth.usecase.ts
│   │   │   └── dtos/
│   │   │       ├── auth.dto.ts
│   │   │       └── auth-response.dto.ts
│   │   ├── application/
│   │   │   └── auth.usecase.ts
│   │   ├── infrastructure/
│   │   │   ├── controllers/
│   │   │   │   └── auth.controller.ts
│   │   │   └── strategies/
│   │   │       ├── local.strategy.ts
│   │   │       └── jwt.strategy.ts
│   │   └── auth.module.ts
│   │
│   ├── invoice/
│   │   ├── domain/
│   │   │   ├── models/
│   │   │   │   ├── invoice.model.ts
│   │   │   │   └── invoice-detail.model.ts
│   │   │   ├── ports/
│   │   │   │   ├── create-invoice.usecase.ts
│   │   │   │   ├── cancel-invoice.usecase.ts
│   │   │   │   ├── get-invoice.usecase.ts
│   │   │   │   ├── get-invoices.usecase.ts
│   │   │   │   └── index.ts
│   │   │   ├── repositories/
│   │   │   │   └── invoice.repository.ts
│   │   │   └── dtos/
│   │   │       ├── create-invoice.dto.ts
│   │   │       └── update-invoice.dto.ts
│   │   ├── application/
│   │   │   ├── create-invoice.usecase.ts
│   │   │   ├── cancel-invoice.usecase.ts
│   │   │   ├── get-invoice.usecase.ts
│   │   │   └── get-invoices.usecase.ts
│   │   ├── infrastructure/
│   │   │   ├── entities/
│   │   │   │   ├── invoice.entity.ts
│   │   │   │   └── invoice-detail.entity.ts
│   │   │   ├── repositories/
│   │   │   │   └── invoice.repository.ts
│   │   │   └── controllers/
│   │   │       └── invoice.controller.ts
│   │   └── invoice.module.ts        ← DI wiring solo para este módulo
│   │
│   ├── product/
│   │   └── ...                      ← Misma estructura
│   ├── budget/
│   │   └── ...
│   └── user/
│       └── ...
│
└── config/
    ├── environment.ts
    └── validation-schema.ts
```

### app.module.ts simplificado

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema }),
    TypeOrmModule.forRootAsync({ useFactory: databaseFactory }),
    SharedModule,
    AuthModule,
    InvoiceModule,
    BudgetModule,
    ProductModule,
    SupplierModule,
    CustomerModule,
    CompanyModule,
    PurchaseModule,
    ExpenseModule,
    LeadModule,
    CategoryModule,
    UserModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(GlobalMiddleware).forRoutes("*");
  }
}
```

### invoice.module.ts (feature module)

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([InvoiceEntity, InvoiceDetailEntity])],
  controllers: [InvoiceController],
  providers: [
    { provide: ICreateInvoiceUseCase, useClass: CreateInvoiceUseCase },
    { provide: ICancelInvoiceUseCase, useClass: CancelInvoiceUseCase },
    { provide: IInvoiceUseCase, useClass: InvoiceUseCase },
    { provide: IInvoicesUseCase, useClass: InvoicesUseCase },
    { provide: IInvoiceRepository, useClass: InvoiceRepository },
  ],
})
export class InvoiceModule {}
```

---

## VENTAJAS DE LA ESTRUCTURA RECOMENDADA

| Beneficio         | Descripción                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| **Cohesión**      | Todo lo relacionado con `Invoice` (dominio, use cases, infra) vive junto |
| **Testabilidad**  | Cada módulo puede testearse de forma aislada                             |
| **Onboarding**    | Un nuevo developer solo necesita entender el módulo que toca             |
| **Lazy loading**  | NestJS puede cargar módulos bajo demanda (útil en microservicios)        |
| **Independencia** | Los módulos no se acoplan entre sí más allá de lo necesario              |
| **Escalabilidad** | Fácil extraer un módulo a un microservicio separado                      |

## DESVENTAJAS / COSTOS

| Costo                    | Descripción                                   | Mitigación                                  |
| ------------------------ | --------------------------------------------- | ------------------------------------------- |
| **Migración**            | Requiere mover archivos existentes            | Hacerlo módulo por módulo, no todo de golce |
| **Duplicación inicial**  | Cada módulo tiene su propia carpeta `domain/` | Compartir en `shared/domain/`               |
| **Más archivos**         | Estructura más verbose                        | La verbosidad da claridad a largo plazo     |
| **Curva de aprendizaje** | El equipo debe entender la nueva organización | Esta guía cubre el por qué y el cómo        |

---

## PLAN DE MIGRACIÓN (para asapi)

### Fase 0 — Correcciones inmediatas (sin mover archivos)

```
□ Eliminar credenciales hardcodeadas de docker-compose.yml
□ Configurar CORS con lista blanca desde env
□ Activar @UseGuards(RolesGuard) en controllers que lo requieran
□ Reemplazar console.log por Logger en todos los services
□ Renombrar upload.controlle.ts → upload.controller.ts (versatil-api)
```

### Fase 1 — Feature modules (un módulo por sprint)

```
Semana 1: Extraer AuthModule + UserModule (menos dependencias)
Semana 2: Extraer CompanyModule + CategoryModule
Semana 3: Extraer ProductModule + SupplierModule + CustomerModule
Semana 4: Extraer InvoiceModule + BudgetModule
Semana 5: Extraer PurchaseModule + ExpenseModule + LeadModule
```

### Fase 2 — Calidad (paralelo a Fase 1)

```
□ Agregar unit tests al extraer cada módulo
□ Activar strict: true para cada módulo nuevo
□ Documentar con @ApiProperty en DTOs del módulo migrado
```

---

_Documento generado a partir del análisis del workspace Vendex — Junio 2026._
