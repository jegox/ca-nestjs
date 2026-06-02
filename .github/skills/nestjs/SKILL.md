# Skill: NestJS — Controllers, Providers, Modules, Guards, Pipes, Interceptors, Filters, DI

> Skill especializada en NestJS para el workspace Vendex.
> Basada en los patrones encontrados en tracking-trucks-api (v10), versatil-api (v9), asapi (v8).

---

## CONTROLLERS

Los controllers son la capa de presentación HTTP. Su única responsabilidad es recibir la petición, delegarla al use case correspondiente y devolver la respuesta.

### Reglas
1. **Solo inyectar use cases** (ports abstractos), nunca repositorios ni servicios directamente
2. Decoradores obligatorios: `@ApiTags`, `@ApiBearerAuth`, `@Controller`
3. Usar DTOs tipados en TODOS los parámetros de entrada
4. No contener lógica de negocio — solo orquestación de la request/response
5. Proteger con `@UseGuards(AuthGuard('jwt'))` por defecto

### Plantilla base
```typescript
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiBearerAuth()
@ApiTags('RESOURCE')
@UseGuards(AuthGuard('jwt'))
@Controller('resource')
export class ResourceController {
  constructor(
    private readonly createUseCase: ICreateResourceUseCase,
    private readonly updateUseCase: IUpdateResourceUseCase,
    private readonly deleteUseCase: IDeleteResourceUseCase,
    private readonly findAllUseCase: IResourcesUseCase,
    private readonly findOneUseCase: IResourceUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateResourceDTO): Promise<ResourceModel> {
    return this.createUseCase.handle(body);
  }

  @Get()
  async findAll(@Query() query: PaginationDTO): Promise<IPagination<ResourceModel>> {
    return this.findAllUseCase.handle(query);
  }

  @Get(':id')
  async findOne(@Param() { id }: ParamUuidDTO): Promise<ResourceModel> {
    return this.findOneUseCase.handle(id);
  }

  @Patch(':id')
  async update(
    @Param() { id }: ParamUuidDTO,
    @Body() body: UpdateResourceDTO,
  ): Promise<ResourceModel> {
    return this.updateUseCase.handle(id, body);
  }

  @Delete(':id')
  async remove(@Param() { id }: ParamUuidDTO): Promise<ResourceModel> {
    return this.deleteUseCase.handle(id);
  }
}
```

### Verbo HTTP → HttpStatus
| Verbo | Uso | Status por defecto |
|---|---|---|
| POST | Crear recurso | 201 Created |
| GET | Consultar | 200 OK |
| PATCH | Actualizar parcial | 200 OK |
| PUT | Reemplazar completo | 200 OK |
| DELETE | Eliminar | 200 OK |

---

## PROVIDERS (Dependency Injection)

NestJS usa el contenedor de IoC de Angular. La clave es inyectar **la abstracción** (port/interface), no la implementación concreta.

### Registro en módulo
```typescript
@Module({
  providers: [
    // ✅ Patrón correcto: provide = abstracción, useClass = implementación
    { provide: ICreateInvoiceUseCase, useClass: CreateInvoiceUseCase },
    { provide: IInvoiceRepository, useClass: InvoiceRepository },
    { provide: IEmailService, useClass: EmailService },

    // ✅ Factory provider (para dependencias externas o condicionales)
    {
      provide: IExternalAdapter,
      useFactory: (configService: ConfigService) => new ExternalAdapter(configService.get('API_URL')),
      inject: [ConfigService],
    },

    // ✅ Proveedor de valor (útil en tests)
    { provide: 'CONFIG_TOKEN', useValue: { timeout: 3000 } },
  ],
})
export class InvoiceModule {}
```

### Scopes de providers
```typescript
// DEFAULT (Singleton) — una instancia para toda la app
@Injectable()
export class InvoiceRepository { }

// REQUEST — nueva instancia por request (usar solo cuando necesario)
@Injectable({ scope: Scope.REQUEST })
export class ApplyUseCase { }

// TRANSIENT — nueva instancia en cada inyección
@Injectable({ scope: Scope.TRANSIENT })
export class TemporaryService { }
```

> **Nota:** `Scope.REQUEST` tiene overhead de performance. Usar solo cuando el caso de uso necesita transacciones de base de datos que duran todo el ciclo de vida de la request (como en `ApplyUseCase` en versatil-api).

---

## MODULES

### Módulo feature-based (recomendado)
```typescript
// invoice/invoice.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([InvoiceEntity, InvoiceDetailEntity]),
  ],
  controllers: [InvoiceController],
  providers: [
    // Use cases
    { provide: ICreateInvoiceUseCase, useClass: CreateInvoiceUseCase },
    { provide: IUpdateInvoiceUseCase, useClass: UpdateInvoiceUseCase },
    { provide: ICancelInvoiceUseCase, useClass: CancelInvoiceUseCase },
    { provide: IInvoicesUseCase, useClass: InvoicesUseCase },
    { provide: IInvoiceUseCase, useClass: InvoiceUseCase },
    // Repositories
    { provide: IInvoiceRepository, useClass: InvoiceRepository },
    { provide: IInvoiceDetailRepository, useClass: InvoiceDetailRepository },
  ],
  exports: [IInvoiceRepository], // Solo exportar lo que otros módulos necesitan
})
export class InvoiceModule {}
```

### App module (raíz)
El `AppModule` solo debe importar módulos feature. Evitar registrar providers de negocio directamente en él.

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema }),
    TypeOrmModule.forRootAsync({ useFactory: databaseFactory }),
    InvoiceModule,
    BudgetModule,
    ProductModule,
    UserModule,
    AuthModule,
    SharedModule,   // Guards, interceptors, pipes compartidos
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(GlobalMiddleware).forRoutes('*');
  }
}
```

### Módulo compartido (SharedModule)
```typescript
@Global()
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ErrorsInterceptor },
    UtilityService,
    PdfService,
  ],
  exports: [UtilityService, PdfService],
})
export class SharedModule {}
```

---

## GUARDS

Los guards implementan la lógica de **autorización** (¿tiene permiso este usuario?). La **autenticación** la maneja Passport.

### JWT Guard (autenticación estándar)
```typescript
// Aplicado como decorador en controller o método
@UseGuards(AuthGuard('jwt'))
```

### Roles Guard (autorización por rol)
```typescript
// infrastructure/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<USER_ROLES[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user) throw new UnauthorizedException();

    if (!roles.includes((user as UserModel).role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

// Decorator de roles
export const Roles = (...roles: USER_ROLES[]) => SetMetadata('roles', roles);

// Uso en controller
@Roles(USER_ROLES.ADMIN, USER_ROLES.FINANCIER)
@Get('reports')
async getReports() { }
```

### Guard de ownership (recurso propio)
```typescript
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as UserModel;
    const resourceCompanyId = request.params.companyId;

    if (user.role === USER_ROLES.SUPERADMIN) return true;
    if (user.company?.id !== resourceCompanyId) {
      throw new ForbiddenException('Access denied to this resource');
    }
    return true;
  }
}
```

---

## PIPES

Los pipes realizan **transformación** y **validación** de datos de entrada.

### ValidationPipe global (bootstrap)
```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Elimina propiedades no declaradas en el DTO
    forbidNonWhitelisted: true,   // Lanza error si hay propiedades extra
    transform: true,              // Convierte tipos automáticamente
    enableImplicitConversion: true,
  }),
);
```

### Custom pipe (ejemplo: validación de tipo de archivo)
```typescript
@Injectable()
export class FileTypeValidationPipe implements PipeTransform {
  private readonly allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
  private readonly maxSizeBytes = 10 * 1024 * 1024; // 10MB

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) throw new BadRequestException('File is required');

    if (!this.allowedMimes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `File type ${file.mimetype} is not allowed`,
      );
    }

    if (file.size > this.maxSizeBytes) {
      throw new PayloadTooLargeException('File exceeds 10MB limit');
    }

    return file;
  }
}
```

---

## INTERCEPTORS

Los interceptors envuelven el ciclo request/response. Permiten transformar la respuesta o manejar errores de forma global.

### Response Interceptor (wrapper estándar)
```typescript
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        status: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### Error Interceptor
```typescript
@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorsInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) => {
        const status = err.status ?? err.errorCode ?? HttpStatus.BAD_REQUEST;
        this.logger.error(`[${context.switchToHttp().getRequest().method}] ${err.message}`, err.stack);

        throw new HttpException(
          { status: false, message: err.message, reason: err?.response?.message },
          status,
        );
      }),
    );
  }
}
```

### Logging Interceptor
```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        this.logger.log(`${method} ${url} — ${ms}ms`);
      }),
    );
  }
}
```

---

## EXCEPTION FILTERS

Los filters capturan excepciones no manejadas y formatean la respuesta de error.

### HTTP Exception Filter global
```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    this.logger.error(
      `${request.method} ${request.url} — ${status} — ${exception.message}`,
    );

    response.status(status).json({
      status: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}
```

### Registrar en bootstrap
```typescript
app.useGlobalFilters(new HttpExceptionFilter());
```

---

## DEPENDENCY INJECTION — Patrones avanzados

### Inyección de token de configuración
```typescript
// infrastructure/config/index.ts
export const config = registerAs('config', () => ({
  port: +process.env.PORT,
  jwtSecret: process.env.JWT_SECRET,
}));

// Uso en service
@Injectable()
export class AuthService {
  constructor(
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
  ) {}

  getSecret(): string {
    return this.configService.jwtSecret;
  }
}
```

### Inyección de repositorio TypeORM
```typescript
@Injectable()
export class InvoiceRepository extends BaseRepository<Invoice>
  implements IInvoiceRepository {

  constructor(
    @InjectRepository(Invoice)
    private readonly repo: Repository<Invoice>,
  ) {
    super(repo);
  }
}
```

### Circular dependency (evitar, pero si ocurre)
```typescript
// Usar forwardRef() solo como último recurso
@Injectable()
export class ServiceA {
  constructor(
    @Inject(forwardRef(() => ServiceB))
    private readonly serviceB: ServiceB,
  ) {}
}
```

---

## MIDDLEWARE

```typescript
// infrastructure/middleware/global.middleware.ts
@Injectable()
export class GlobalMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;

    res.on('close', () => {
      const { statusCode } = res;
      this.logger.log(
        `${method} ${originalUrl} ${statusCode} — IP: ${ip}`,
      );
    });

    next();
  }
}

// Registro en AppModule
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(GlobalMiddleware).forRoutes('*');
  }
}
```

---

## AUTENTICACIÓN JWT (Passport)

### Estrategia Local (login con email/password)
```typescript
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly utilityService: UtilityService,
  ) {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  async validate(email: string, password: string): Promise<UserModel | null> {
    const user = await this.userRepo.findOne({
      where: { email, isActive: true },
    });
    if (!user) return null;

    const isMatch = await this.utilityService.compare(password, user.password);
    return isMatch ? user : null;
  }
}
```

### Estrategia JWT (requests autenticadas)
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { id: string }): Promise<UserModel> {
    const user = await this.userRepo.findOne({
      where: { id: payload.id, isActive: true },
    });
    if (!user) throw new UnauthorizedException('User not found or inactive');
    return user;
  }
}
```

---

*Skill generada a partir del análisis del workspace Vendex — Junio 2026.*
