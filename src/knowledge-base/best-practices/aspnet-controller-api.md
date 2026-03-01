# ASP.NET Core Controller API Specification

> **Runtime:** .NET 9+ (latest LTS)
> **Hosting:** Azure App Service (Windows or Linux)
> **Purpose:** Enforce consistent code quality for traditional ASP.NET Core controller-based REST APIs.
> **Audience:** Developers and AI coding agents (Claude Code compatible).

---

## Project Structure

```
src/
├── MyApi/
│   ├── Controllers/             # API controllers only — no business logic
│   ├── Models/
│   │   ├── Requests/            # Incoming DTOs (suffixed with Request)
│   │   ├── Responses/           # Outgoing DTOs (suffixed with Response)
│   │   └── Domain/              # Domain/entity models
│   ├── Services/                # Business logic interfaces + implementations
│   ├── Repositories/            # Data access interfaces + implementations
│   ├── Middleware/               # Custom middleware (correlation ID, exception handling)
│   ├── Extensions/              # IServiceCollection and IApplicationBuilder extensions
│   ├── Configuration/           # Strongly-typed settings classes (IOptions<T>)
│   ├── FeatureFlags/            # Feature flag definitions, filters, and providers
│   ├── Validators/              # FluentValidation validators
│   ├── Mappers/                 # AutoMapper profiles or manual mapping extensions
│   └── Program.cs               # Composition root — DI, middleware pipeline
├── MyApi.Tests/
│   ├── Unit/                    # Isolated unit tests (mocked dependencies)
│   ├── Integration/             # TestServer / WebApplicationFactory tests
│   └── Fixtures/                # Shared test fixtures and builders
└── MyApi.sln
```

### Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Controller | `{Resource}Controller` | `OrdersController` |
| Service interface | `I{Name}Service` | `IOrderService` |
| Service implementation | `{Name}Service` | `OrderService` |
| Repository interface | `I{Name}Repository` | `IOrderRepository` |
| Request DTO | `{Action}{Resource}Request` | `CreateOrderRequest` |
| Response DTO | `{Resource}Response` | `OrderResponse` |
| Validator | `{DtoName}Validator` | `CreateOrderRequestValidator` |
| Configuration class | `{Feature}Settings` | `CacheSettings` |
| Feature flag | `{Feature}Flag` constant string | `"EnableBulkOrders"` |

---

## Dependency Injection

All dependencies MUST be registered in `Program.cs` or via extension methods in `Extensions/`. Constructor injection is the only permitted injection pattern.

### Rules

1. **Every class with behavior MUST depend on abstractions (interfaces), never concrete types.**
2. **Register services with the narrowest possible lifetime:**
   - `Singleton` — stateless, thread-safe services (e.g., `IMemoryCache`, HTTP client factories).
   - `Scoped` — per-request state (e.g., `DbContext`, unit-of-work, services that depend on scoped resources).
   - `Transient` — lightweight, stateless helpers where a fresh instance is appropriate.
3. **Never resolve services via `IServiceProvider` directly (service locator anti-pattern) except inside factory delegates.**
4. **Group registrations into extension methods for readability.**

### Extension Method Pattern

```csharp
// Extensions/ServiceCollectionExtensions.cs
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddOrderServices(this IServiceCollection services)
    {
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        return services;
    }
}
```

```csharp
// Program.cs
builder.Services.AddOrderServices();
builder.Services.AddFeatureFlagServices();
```

### Configuration Binding

```csharp
// Configuration/CacheSettings.cs
public sealed class CacheSettings
{
    public const string SectionName = "Cache";
    public int DefaultExpirationMinutes { get; init; } = 5;
    public bool Enabled { get; init; } = true;
}

// Registration
builder.Services.Configure<CacheSettings>(
    builder.Configuration.GetSection(CacheSettings.SectionName));
```

Inject as `IOptions<CacheSettings>`, `IOptionsSnapshot<CacheSettings>` (scoped reload), or `IOptionsMonitor<CacheSettings>` (singleton reload).

---

## Feature Flags

Feature flags MUST be implemented using `Microsoft.FeatureManagement`. All flag checks MUST be injectable and testable — never read raw configuration booleans directly.

### Setup

```csharp
// Program.cs
builder.Services.AddFeatureManagement(
    builder.Configuration.GetSection("FeatureManagement"));
```

### Defining Flags

```csharp
// FeatureFlags/FeatureFlags.cs
public static class FeatureFlags
{
    public const string EnableBulkOrders = "EnableBulkOrders";
    public const string UseNewPricingEngine = "UseNewPricingEngine";
    public const string EnableV2Endpoint = "EnableV2Endpoint";
}
```

### Configuration (appsettings.json / Azure App Configuration)

```json
{
  "FeatureManagement": {
    "EnableBulkOrders": true,
    "UseNewPricingEngine": {
      "EnabledFor": [
        {
          "Name": "Percentage",
          "Parameters": { "Value": 25 }
        }
      ]
    }
  }
}
```

### Usage in Services (preferred)

```csharp
public class OrderService : IOrderService
{
    private readonly IFeatureManager _featureManager;

    public OrderService(IFeatureManager featureManager)
    {
        _featureManager = featureManager;
    }

    public async Task<OrderResponse> CreateOrderAsync(CreateOrderRequest request)
    {
        if (await _featureManager.IsEnabledAsync(FeatureFlags.UseNewPricingEngine))
        {
            // new path
        }
        else
        {
            // existing path
        }
    }
}
```

### Usage on Controllers (gate entire endpoints)

```csharp
[FeatureGate(FeatureFlags.EnableV2Endpoint)]
[HttpPost("v2/orders")]
public async Task<IActionResult> CreateOrderV2(CreateOrderRequest request) { ... }
```

### Testing Feature Flags

In unit tests, mock `IFeatureManager`:

```csharp
var featureManager = Substitute.For<IFeatureManager>();  // NSubstitute
featureManager.IsEnabledAsync(FeatureFlags.UseNewPricingEngine)
    .Returns(true);
```

---

## Controller Rules

Controllers are thin HTTP boundary layers. They MUST NOT contain business logic.

### Template

```csharp
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(IOrderService orderService, ILogger<OrdersController> logger)
    {
        _orderService = orderService;
        _logger = logger;
    }

    /// <summary>
    /// Creates a new order.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(OrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CreateOrder(
        [FromBody] CreateOrderRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _orderService.CreateOrderAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetOrder), new { id = result.Id }, result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(OrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOrder(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _orderService.GetOrderAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
```

### Controller Checklist

- [ ] Class is decorated with `[ApiController]` and `[Route("api/[controller]")]`.
- [ ] All public action methods are `async Task<IActionResult>`.
- [ ] Every action accepts `CancellationToken cancellationToken` as the last parameter.
- [ ] Every action has `[ProducesResponseType]` attributes for all possible status codes.
- [ ] Zero business logic — controllers only call a single service method and map the result to an HTTP response.
- [ ] Route parameters use type constraints (e.g., `{id:guid}`, `{page:int}`).
- [ ] POST/PUT bodies use `[FromBody]`; query strings use `[FromQuery]`.
- [ ] XML doc comments on every public action method.
- [ ] OpenAPI operation metadata is complete (summary, response types, tags).

---

## OpenAPI / Swagger Specification

Every API MUST expose a complete, accurate OpenAPI specification. This is non-negotiable — it is the contract between your API and every consumer, SDK generator, API gateway, test harness, and documentation portal that depends on it.

### Setup (.NET 9+)

.NET 9+ uses the built-in `Microsoft.AspNetCore.OpenApi` package (Swashbuckle is no longer the default). Configure in `Program.cs`:

```csharp
// Program.cs
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, ct) =>
    {
        document.Info = new()
        {
            Title = "My API",
            Version = "v1",
            Description = "Order management REST API.",
            Contact = new() { Name = "Platform Team", Email = "platform@example.com" }
        };
        return Task.CompletedTask;
    });
});

// In the middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();          // serves /openapi/v1.json
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "My API v1");
    });
}
```

For Swagger UI in development, add the `Swashbuckle.AspNetCore.SwaggerUI` package (UI only — the spec generation is handled by `Microsoft.AspNetCore.OpenApi`).

### Alternative: Swashbuckle (for projects not yet on .NET 9 OpenApi)

```csharp
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "My API",
        Version = "v1",
        Description = "Order management REST API.",
        Contact = new OpenApiContact { Name = "Platform Team", Email = "platform@example.com" }
    });

    // Include XML comments from the build output
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    options.IncludeXmlComments(xmlPath);

    // Add JWT bearer auth definition
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
```

Enable XML documentation generation in the `.csproj`:

```xml
<PropertyGroup>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <NoWarn>$(NoWarn);1591</NoWarn>
</PropertyGroup>
```

### XML Documentation Rules

Every public controller action MUST have XML doc comments that flow into the OpenAPI spec:

```csharp
/// <summary>
/// Creates a new order for the specified customer.
/// </summary>
/// <param name="request">The order creation payload.</param>
/// <param name="cancellationToken">Cancellation token.</param>
/// <returns>The newly created order.</returns>
/// <response code="201">Order created successfully.</response>
/// <response code="400">Validation failed. See ProblemDetails for field-level errors.</response>
/// <response code="401">Authentication required.</response>
/// <response code="500">Unexpected server error.</response>
[HttpPost]
[ProducesResponseType(typeof(OrderResponse), StatusCodes.Status201Created)]
[ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
public async Task<IActionResult> CreateOrder(
    [FromBody] CreateOrderRequest request,
    CancellationToken cancellationToken)
```

### DTO Documentation

Request and response DTOs MUST also have XML doc comments so that schema descriptions appear in the OpenAPI spec:

```csharp
/// <summary>
/// Payload for creating a new order.
/// </summary>
public sealed class CreateOrderRequest
{
    /// <summary>
    /// The unique identifier of the customer placing the order.
    /// </summary>
    /// <example>3fa85f64-5717-4562-b3fc-2c963f66afa6</example>
    public required Guid CustomerId { get; init; }

    /// <summary>
    /// One or more line items in the order. Must not be empty.
    /// </summary>
    public required List<OrderLineItemRequest> LineItems { get; init; }
}
```

### API Versioning in the OpenAPI Spec

If the API uses versioning (URL path, header, or query string), each version MUST produce its own OpenAPI document:

```csharp
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
})
.AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});
```

### OpenAPI Checklist

- [ ] OpenAPI JSON endpoint is accessible in development and staging (e.g., `/openapi/v1.json` or `/swagger/v1/swagger.json`).
- [ ] Swagger UI is available in non-production environments.
- [ ] Every controller action has `<summary>`, `<param>`, `<returns>`, and `<response>` XML doc comments.
- [ ] Every request/response DTO has `<summary>` on the class and every public property.
- [ ] DTOs include `<example>` tags for key properties to provide sample values in the Swagger UI.
- [ ] Every action has `[ProducesResponseType]` for ALL possible status codes (200, 201, 400, 401, 403, 404, 500).
- [ ] Authentication scheme (Bearer JWT, API key, etc.) is defined and applied globally via `AddSecurityDefinition` / `AddSecurityRequirement`.
- [ ] `GenerateDocumentationFile` is enabled in the `.csproj`.
- [ ] OpenAPI spec is NOT exposed in production unless intentionally public — gate behind environment check or feature flag.
- [ ] If versioned, each API version has its own OpenAPI document.

---

## Error Handling

### Global Exception Middleware

```csharp
// Middleware/GlobalExceptionMiddleware.cs
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception for {Method} {Path}",
                context.Request.Method, context.Request.Path);

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/problem+json";

            var problem = new ProblemDetails
            {
                Status = 500,
                Title = "Internal Server Error",
                Detail = "An unexpected error occurred.",
                Instance = context.Request.Path
            };

            await context.Response.WriteAsJsonAsync(problem);
        }
    }
}
```

### Rules

1. **Never return raw exception messages to clients in production.**
2. **Use `ProblemDetails` (RFC 9457) for all error responses.**
3. **Throw custom domain exceptions (e.g., `NotFoundException`, `ConflictException`) from services; map to HTTP status codes in middleware or a filter.**
4. **Always log the full exception with structured logging before returning the sanitized response.**

---

## Validation

Use **FluentValidation** registered via DI. Do not use Data Annotations on request DTOs.

```csharp
// Validators/CreateOrderRequestValidator.cs
public class CreateOrderRequestValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderRequestValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.LineItems).NotEmpty()
            .ForEach(item =>
            {
                item.ChildRules(li =>
                {
                    li.RuleFor(l => l.ProductId).NotEmpty();
                    li.RuleFor(l => l.Quantity).GreaterThan(0);
                });
            });
    }
}
```

Register all validators automatically:

```csharp
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddFluentValidationAutoValidation();
```

---

## Logging & Observability

1. **Use `ILogger<T>` everywhere.** Never use `Console.WriteLine` or static loggers.
2. **Use structured logging with message templates — never string interpolation.**

```csharp
// Correct
_logger.LogInformation("Order {OrderId} created for customer {CustomerId}", order.Id, order.CustomerId);

// Wrong — allocates a string even when log level is disabled
_logger.LogInformation($"Order {order.Id} created for customer {order.CustomerId}");
```

3. **Add a correlation ID middleware** that reads/generates `X-Correlation-Id` and pushes it into the log scope.
4. **Configure Application Insights** for Azure App Service telemetry.

```csharp
builder.Services.AddApplicationInsightsTelemetry();
```

---

## Health Checks

```csharp
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database")
    .AddAzureBlobStorage(
        builder.Configuration.GetConnectionString("BlobStorage")!,
        name: "blob-storage");

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
```

Every deployable API MUST expose `/health` for Azure App Service health probes.

---

## Testing Requirements

### Unit Tests

- Use **xUnit** as the test framework.
- Use **NSubstitute** for mocking interfaces.
- Use **FluentAssertions** for readable assertions.
- Test services, validators, and mappers in isolation.
- Feature flag behavior must be tested for both enabled and disabled states.

```csharp
[Fact]
public async Task CreateOrder_WhenNewPricingEnabled_UsesNewEngine()
{
    // Arrange
    var featureManager = Substitute.For<IFeatureManager>();
    featureManager.IsEnabledAsync(FeatureFlags.UseNewPricingEngine).Returns(true);
    var sut = new OrderService(featureManager, _mockRepo);

    // Act
    var result = await sut.CreateOrderAsync(request, CancellationToken.None);

    // Assert
    result.PricingEngine.Should().Be("v2");
}
```

### Integration Tests

- Use `WebApplicationFactory<Program>` with a test `appsettings.Testing.json`.
- Override DI registrations for external dependencies (databases, third-party APIs).
- Feature flags should be overridden to test gated endpoints:

```csharp
public class OrdersApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public OrdersApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Override feature flags for test
                services.Configure<FeatureManagementOptions>(opts => { });
                services.AddSingleton<IFeatureManager>(
                    new TestFeatureManager(new Dictionary<string, bool>
                    {
                        [FeatureFlags.EnableBulkOrders] = true
                    }));
            });
        }).CreateClient();
    }
}
```

### Test Naming

```
{MethodUnderTest}_{Scenario}_{ExpectedBehavior}
```

Example: `CreateOrderAsync_WhenCustomerIdMissing_ThrowsValidationException`

---

## Azure App Service Deployment Checklist

- [ ] `ASPNETCORE_ENVIRONMENT` is set to `Production` (or `Staging`) in App Service Configuration.
- [ ] Connection strings and secrets are stored in **Azure Key Vault** and referenced via App Configuration or Key Vault references.
- [ ] Application Insights is connected and instrumentation key is configured.
- [ ] Health check endpoint is configured as the App Service health probe path.
- [ ] Managed Identity is enabled for Key Vault, SQL, and Storage access — no connection string passwords in config.
- [ ] CORS policy is explicitly configured and restrictive.
- [ ] `appsettings.Production.json` does NOT contain secrets.
- [ ] Feature flags are managed via Azure App Configuration (recommended) or `appsettings.json`.
- [ ] OpenAPI spec endpoint is verified accessible in Staging; blocked or intentionally exposed in Production.
- [ ] If using Azure API Management, the OpenAPI spec is imported and kept in sync with deployments.

---

## Claude Code Instructions

When generating or modifying code in this project:

1. **Always follow the project structure above.** Place files in the correct directory.
2. **Register every new service in DI** via the appropriate extension method in `Extensions/`.
3. **Never put business logic in controllers.** If a controller method exceeds 10 lines, refactor logic into a service.
4. **Always inject `IFeatureManager`** when adding conditional behavior — never check `IConfiguration` directly for feature toggles.
5. **Every new endpoint MUST include** `[ProducesResponseType]` attributes for all possible status codes, `CancellationToken`, and full XML doc comments (`<summary>`, `<param>`, `<returns>`, `<response>`).
6. **Every new request/response DTO MUST include** XML doc comments on the class and every public property, with `<example>` tags on key fields for OpenAPI spec enrichment.
7. **Every new request DTO MUST have a matching FluentValidation validator.**
8. **Every new service MUST have a corresponding unit test class** with tests for happy path and at least one failure case.
9. **Feature flag tests MUST cover both enabled and disabled states.**
10. **Use structured logging message templates** — never string interpolation in log calls.
11. **Prefer `sealed` on classes that are not designed for inheritance.**
12. **Use `init` properties on DTOs and configuration classes for immutability.**
13. **All async methods MUST accept and forward `CancellationToken`.**
14. **Do not suppress or catch exceptions silently.** All catch blocks must log.
15. **Use file-scoped namespaces** (`namespace MyApi.Services;`) in all files.
16. **Target .NET 9+** — use latest C# language features (primary constructors, collection expressions, etc.) where they improve clarity.
17. **OpenAPI completeness is mandatory.** When adding a new endpoint, verify the generated OpenAPI spec accurately represents the route, parameters, request body, all response types, and authentication requirements. Incomplete specs are bugs.
