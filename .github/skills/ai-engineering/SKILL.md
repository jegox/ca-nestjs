# Skill: AI Engineering — Prompt Engineering, AI Services, LLM Integrations, AI Security, Observability

> Skill de AI Engineering aplicada al contexto de desarrollo en el workspace Vendex.
> Cubre cómo integrar servicios de IA de forma segura, mantenible y observable en aplicaciones NestJS.

---

## PROMPT ENGINEERING

### Principios fundamentales

**1. Ser específico y contextual**
```typescript
// ❌ Prompt vago
const prompt = 'Analiza la factura';

// ✅ Prompt específico con contexto y formato de salida esperado
const prompt = `
Eres un asistente contable especializado en facturación colombiana.
Analiza los siguientes datos de factura y devuelve un JSON con:
- "isValid": boolean
- "issues": string[] (lista de problemas encontrados)
- "suggestions": string[] (mejoras recomendadas)

Datos de la factura:
${JSON.stringify(invoiceData, null, 2)}

Responde ÚNICAMENTE con JSON válido, sin explicaciones adicionales.
`;
```

**2. Usar system prompts para establecer el rol**
```typescript
const messages = [
  {
    role: 'system',
    content: `Eres un asistente de análisis de datos para GraciaERP, 
              un sistema de contabilidad colombiano. 
              Responde siempre en español.
              No inventes datos que no estén en el contexto proporcionado.
              Si no tienes suficiente información, dilo claramente.`,
  },
  {
    role: 'user',
    content: userMessage,
  },
];
```

**3. Few-shot prompting para tareas complejas**
```typescript
const prompt = `
Clasifica el siguiente gasto en una categoría contable colombiana.

Ejemplos:
- "Compra de papel carta" → "Papelería y útiles"
- "Pago de arrendamiento bodega" → "Arrendamientos"
- "Mantenimiento computador" → "Mantenimiento y reparaciones"
- "Gasolina vehículo empresa" → "Combustibles y lubricantes"

Ahora clasifica:
"${expenseDescription}"

Responde solo con el nombre de la categoría.
`;
```

**4. Chain of Thought (para razonamiento complejo)**
```typescript
const prompt = `
Analiza si esta factura de compra es elegible para descuento de IVA según la normativa colombiana.

Piensa paso a paso:
1. ¿El proveedor está inscrito en el RUT?
2. ¿El bien/servicio es gravado con IVA?
3. ¿La empresa compradora es responsable de IVA?
4. ¿La factura cumple los requisitos del Art. 617 del Estatuto Tributario?

Datos: ${JSON.stringify(purchaseData)}

Razonamiento:
[Analiza cada punto]

Conclusión:
[Elegible/No elegible] porque [razón principal]
`;
```

---

## INTEGRACIÓN DE SERVICIOS DE IA EN NESTJS

### Adapter Pattern para AI (Hexagonal)

```typescript
// domain/adapters/ai.adapter.ts
export abstract class IAIAdapter {
  abstract complete(prompt: string, options?: AIOptions): Promise<string>;
  abstract chat(messages: ChatMessage[], options?: AIOptions): Promise<string>;
  abstract embed(text: string): Promise<number[]>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}
```

```typescript
// infrastructure/adapters/openai.adapter.ts
@Injectable()
export class OpenAIAdapter implements IAIAdapter {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenAIAdapter.name);
  private readonly defaultModel = 'gpt-4o-mini';

  constructor(@Inject(config.KEY) private readonly configService: ConfigType<typeof config>) {
    this.client = new OpenAI({
      apiKey: configService.ai.openaiApiKey,
      timeout: 30_000,
      maxRetries: 2,
    });
  }

  async complete(prompt: string, options?: AIOptions): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  async chat(messages: ChatMessage[], options?: AIOptions): Promise<string> {
    const start = Date.now();
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model ?? this.defaultModel,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
      });

      const content = response.choices[0].message.content ?? '';
      this.logger.log(
        `[chat] model=${options?.model ?? this.defaultModel} tokens=${response.usage?.total_tokens} ms=${Date.now() - start}`,
      );
      return content;
    } catch (err) {
      this.logger.error(`[chat] AI request failed`, err.stack);
      throw new InternalServerErrorException('AI service unavailable');
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
}
```

### Domain Service de IA
```typescript
// domain/services/invoice-analyzer.service.ts
export abstract class IInvoiceAnalyzerService {
  abstract analyzeForIssues(invoice: InvoiceModel): Promise<InvoiceAnalysis>;
  abstract suggestCategory(description: string): Promise<string>;
  abstract generateSummary(invoices: InvoiceModel[]): Promise<string>;
}

export interface InvoiceAnalysis {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  confidence: number;
}
```

```typescript
// infrastructure/services/invoice-analyzer.service.ts
@Injectable()
export class InvoiceAnalyzerService implements IInvoiceAnalyzerService {
  private readonly logger = new Logger(InvoiceAnalyzerService.name);

  constructor(private readonly aiAdapter: IAIAdapter) {}

  async analyzeForIssues(invoice: InvoiceModel): Promise<InvoiceAnalysis> {
    const prompt = this.buildAnalysisPrompt(invoice);
    const response = await this.aiAdapter.complete(prompt, { temperature: 0.1 });

    try {
      return JSON.parse(response) as InvoiceAnalysis;
    } catch {
      this.logger.warn(`[analyzeForIssues] Failed to parse AI response as JSON`);
      return { isValid: true, issues: [], suggestions: [], confidence: 0 };
    }
  }

  private buildAnalysisPrompt(invoice: InvoiceModel): string {
    return `
Analiza esta factura y devuelve un JSON con: isValid, issues[], suggestions[], confidence (0-1).

Factura:
- Total: ${invoice.total} COP
- IVA: ${invoice.vat} COP  
- Tipo de pago: ${invoice.paymentType}
- Items: ${invoice.details.length}
- Fecha vencimiento: ${invoice.dueDate ?? 'No especificada'}

Verifica: totales correctos, IVA del 19%, campos requeridos presentes.
Responde SOLO con JSON válido.
    `.trim();
  }
}
```

---

## SEGURIDAD EN AI

### Prevención de Prompt Injection

```typescript
// ✅ Sanitizar input del usuario antes de incluirlo en prompts
function sanitizeUserInput(input: string): string {
  // Eliminar instrucciones de sistema que el usuario pudiera inyectar
  const dangerousPatterns = [
    /ignore (previous|all|above) instructions/gi,
    /you are now/gi,
    /act as/gi,
    /pretend (you are|to be)/gi,
    /disregard/gi,
    /\[INST\]/gi,   // Llama instruction tokens
    /<\|im_start\|>/gi,  // ChatML tokens
  ];

  let sanitized = input;
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }

  // Limitar longitud para evitar ataques de dilución
  return sanitized.slice(0, 2000);
}

// ✅ Separar claramente el contexto del sistema del input del usuario
const prompt = `
=== INSTRUCCIONES DEL SISTEMA (no modificable) ===
Eres un asistente contable. Responde solo sobre temas de contabilidad colombiana.

=== INPUT DEL USUARIO (puede ser no confiable) ===
${sanitizeUserInput(userInput)}

=== FIN DEL INPUT ===
Responde basándote únicamente en el contexto de contabilidad proporcionado.
`;
```

### Validación de outputs de IA
```typescript
// ✅ Nunca confiar ciegamente en el output de la IA
async suggestCategory(description: string): Promise<string> {
  const aiSuggestion = await this.aiAdapter.complete(prompt);

  // Validar contra lista de categorías conocidas
  const validCategories = await this.categoryRepo.find({ where: { isActive: true } });
  const validNames = validCategories.map((c) => c.name.toLowerCase());

  if (!validNames.includes(aiSuggestion.toLowerCase().trim())) {
    this.logger.warn(`AI suggested unknown category: "${aiSuggestion}"`);
    return 'Otros gastos'; // Fallback seguro
  }

  return aiSuggestion.trim();
}
```

### Rate limiting y costos
```typescript
// ✅ Implementar rate limiting para llamadas a AI
@Injectable()
export class AIRateLimiter {
  private readonly requestsPerMinute = 60;
  private requestCount = 0;
  private resetTime = Date.now() + 60_000;

  async checkLimit(): Promise<void> {
    const now = Date.now();
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60_000;
    }

    if (this.requestCount >= this.requestsPerMinute) {
      throw new TooManyRequestsException('AI service rate limit exceeded');
    }

    this.requestCount++;
  }
}

// ✅ Estimar y controlar costos
const COST_PER_TOKEN = 0.00015 / 1000; // gpt-4o-mini input
const MAX_TOKENS_PER_REQUEST = 2048;
const MAX_MONTHLY_COST_USD = 50;
```

### Variables de entorno para claves de AI
```typescript
// env.example
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1024
OPENAI_TEMPERATURE=0.7

// infrastructure/config/environment.ts
ai: {
  openaiApiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  maxTokens: +(process.env.OPENAI_MAX_TOKENS ?? 1024),
},

// infrastructure/config/validation-schema.ts
OPENAI_API_KEY: Joi.string().required(),
```

---

## OBSERVABILIDAD DE AI

### Logging estructurado de llamadas a LLM
```typescript
// infrastructure/interceptors/ai-logging.interceptor.ts
@Injectable()
export class AILoggingInterceptor {
  private readonly logger = new Logger('AI');

  async logRequest(params: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
    useCase: string;
    success: boolean;
    error?: string;
  }): Promise<void> {
    this.logger.log({
      event: 'ai_request',
      ...params,
      timestamp: new Date().toISOString(),
      estimatedCostUsd: this.estimateCost(params.model, params.promptTokens, params.completionTokens),
    });
  }

  private estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const costs: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
      'gpt-4o': { input: 0.005 / 1000, output: 0.015 / 1000 },
    };
    const cost = costs[model] ?? costs['gpt-4o-mini'];
    return inputTokens * cost.input + outputTokens * cost.output;
  }
}
```

### Trazabilidad (Correlation IDs)
```typescript
// ✅ Incluir correlation ID en todas las llamadas a IA
@Injectable()
export class OpenAIAdapter implements IAIAdapter {
  async chat(messages: ChatMessage[], options?: AIOptions, correlationId?: string): Promise<string> {
    this.logger.log(`[${correlationId}] Calling AI — model: ${options?.model}`);

    const response = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
      messages,
      // Pasar el correlationId como metadata si el proveedor lo soporta
      user: correlationId,
    });

    this.logger.log(
      `[${correlationId}] AI response — tokens: ${response.usage?.total_tokens}, finish: ${response.choices[0].finish_reason}`,
    );
    return response.choices[0].message.content ?? '';
  }
}
```

### Health check para AI
```typescript
// infrastructure/health/ai.health.ts
@Injectable()
export class AIHealthIndicator extends HealthIndicator {
  constructor(private readonly aiAdapter: IAIAdapter) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const response = await Promise.race([
        this.aiAdapter.complete('Responde solo "ok"', { maxTokens: 5 }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000),
        ),
      ]);

      const isUp = response.toLowerCase().includes('ok');
      return this.getStatus(key, isUp);
    } catch (err) {
      throw new HealthCheckError('AI service check failed', this.getStatus(key, false));
    }
  }
}
```

---

## PATRONES DE INTEGRACIÓN CON LLMs

### Retrieval Augmented Generation (RAG)
Para agregar contexto específico del negocio al LLM:

```typescript
// Concepto: buscar documentos relevantes + incluirlos en el prompt
@Injectable()
export class RAGService {
  constructor(
    private readonly aiAdapter: IAIAdapter,
    private readonly vectorStore: IVectorStore,
  ) {}

  async query(userQuestion: string, companyId: string): Promise<string> {
    // 1. Convertir pregunta a embedding
    const questionEmbedding = await this.aiAdapter.embed(userQuestion);

    // 2. Buscar documentos similares en el vector store
    const relevantDocs = await this.vectorStore.search(questionEmbedding, {
      filter: { companyId },
      limit: 5,
    });

    // 3. Construir prompt con contexto
    const context = relevantDocs.map((d) => d.content).join('\n\n');
    const prompt = `
Contexto de la empresa (usar solo esta información):
${context}

Pregunta del usuario:
${userQuestion}

Responde basándote exclusivamente en el contexto proporcionado.
Si la información no está en el contexto, di "No tengo esa información".
    `;

    return this.aiAdapter.complete(prompt, { temperature: 0.3 });
  }
}
```

### Structured Outputs (JSON mode)
```typescript
// ✅ Forzar output estructurado con OpenAI
const response = await this.client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages,
  response_format: { type: 'json_object' }, // Garantiza JSON válido
});

// ✅ Validar el JSON con class-validator
const parsed = JSON.parse(response.choices[0].message.content);
const dto = plainToClass(AIResponseDTO, parsed);
const errors = await validate(dto);
if (errors.length > 0) {
  throw new BadRequestException('AI returned invalid data structure');
}
```

### Streaming para respuestas largas
```typescript
// ✅ Streaming para UX mejor en respuestas extensas
async streamComplete(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
  const stream = await this.client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0].delta.content ?? '';
    if (content) onChunk(content);
  }
}
```

---

## CASOS DE USO DE AI EN EL WORKSPACE

### Oportunidades identificadas en los repos

| Repo | Caso de uso AI | Beneficio |
|---|---|---|
| **asapi** | Clasificación automática de gastos | Reduce tiempo de entrada manual |
| **asapi** | Detección de facturas duplicadas | Previene errores contables |
| **asapi** | Generación de descripciones de productos | Acelera creación de catálogo |
| **asapi** | Análisis de presupuestos vs reales | Insights financieros automáticos |
| **tracking-trucks-api** | Detección de anomalías en señales | Mantenimiento predictivo |
| **tracking-trucks-api** | Generación de resúmenes de turno | Reportes automáticos |
| **versatil-api** | Validación de documentos legales | Reduce revisión manual |
| **versatil-api** | Scoring de aplicaciones de financiamiento | Agiliza aprobaciones |

---

## CHECKLIST DE AI ENGINEERING

Antes de lanzar una feature de AI a producción:

```
□ ¿Las claves de API están en variables de entorno (no hardcodeadas)?
□ ¿Los prompts están versionados y documentados?
□ ¿El output de la IA es validado antes de usarse?
□ ¿El input del usuario está sanitizado contra prompt injection?
□ ¿Hay logging de tokens consumidos y costos estimados?
□ ¿Hay fallback si el servicio de AI no está disponible?
□ ¿Hay rate limiting para evitar costos descontrolados?
□ ¿El adapter de AI está abstraído tras un port (Hexagonal)?
□ ¿Hay tests unitarios con mocks del adapter de AI?
□ ¿El health check del servicio de AI está implementado?
□ ¿Hay timeout configurado para las llamadas?
□ ¿Los usuarios saben cuándo están interactuando con IA?
```

---

*Skill generada a partir del análisis del workspace Vendex — Junio 2026.*
