# Azure Functions C# REST API Specification

> **Runtime:** .NET 9+ Isolated Worker Model (out-of-process)
> **Hosting:** Azure Functions (Consumption, Premium, or Dedicated plan)
> **Trigger:** HTTP trigger functions acting as REST API endpoints
> **Purpose:** Enforce consistent code quality for serverless REST APIs built with Azure Functions.
> **Audience:** Developers and AI coding agents (Claude Code compatible).

---

## Critical: Isolated Worker Model Only

All new Azure Functions projects MUST use the **Isolated Worker (out-of-process) model**. The in-process model is deprecated. This means:

- Host entry point is `Program.cs` with `HostBuilder`.
- Functions are plain C# classes — no inheritance from a base class.
- Dependency injection works via `Microsoft.Extensions.DependencyInjection` (same as ASP.NET Core).
- Middleware pipeline is available via `IFunctionsWorkerMiddleware`.

---

## Project Structure

```
src/
├── MyApi.Functions/
│   ├── Functions/                # HTTP-triggered function classes (grouped by resource)
│   │   ├── Orders/
│   │   │   ├── CreateOrderFunction.cs
│   │   │   ├── GetOrderFunction.cs
│   │   │   └── ListOrdersFunction.cs
│   │   └── Products/
│   │       └── GetProductFunction.cs
│   ├── Models/
│   │   ├── Requests/             # Incoming DTOs (suffixed with Request)
│   │   ├── Responses/            # Outgoing DTOs (suffixed with Response)
│   │   └── Domain/               # Domain/entity models
│   ├── Services/                 # Business logic interfaces + implementations
│   ├── Repositories/             # Data access interfaces + implementations
│   ├── Middleware/                # IFunctionsWorkerMiddleware implementations
│   ├── Extensions/               # IServiceCollection and IHostBuilder extensions
│   ├── Configuration/            # Strongly-typed settings classes
│   ├── FeatureFlags/             # Feature flag definitions and helpers
│   ├── Validators/               # FluentValidation validators
│   ├── Mappers/                  # Mapping profiles or extension methods
│   ├── Program.cs                # Composition root — DI, middleware
│   ├── host.json                 # Functions host configuration
│   └── local.settings.json       # Local dev settings (NEVER commit secrets)
├── MyApi.Functions.Tests/
│   ├── Unit/
│   ├── Integration/
│   └── Fixtures/
└── MyApi.Functions.sln
```

### Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Function class | `{Action}{Resource}Function` | `CreateOrderFunction` |
| Function method | `Run` or `RunAsync` | `RunAsync` |
| Function name (attribute) | `{Action}{Resource}` | `"CreateOrder"` |
| Route | RESTful, lowercase, plural nouns | `"orders/{id:guid}"` |
| Service interface | `I{Name}Service` | `IOrderService` |
| Service implementation | `{Name}Service` | `OrderService` |
| Request DTO | `{Action}{Resource}Request` | `CreateOrderRequest` |
| Response DTO | `{Resource}Response` | `OrderResponse` |
| Validator | `{DtoName}Validator` | `CreateOrderRequestValidator` |
| Configuration class | `{Feature}Settings` | `CacheSettings` |
| Feature flag | `{Feature}Flag` constant string | `"EnableBulkOrders"` |

---

## Program.cs (Composition Root)

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.FeatureManagement;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(worker =>
    {
        worker.UseMiddleware<ExceptionHandlingMiddleware>();
        worker.UseMiddleware<CorrelationIdMiddleware>();
    })
    .ConfigureServices((context, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        // Feature management
        services.AddFeatureManagement(
            context.Configuration.GetSection("FeatureManagement"));

        // Application services
        services.AddOrderServices();
        services.AddProductServices();

        // Validation
        services.AddValidatorsFromAssemblyContaining<Program>();
    })
    .Build();

host.Run();
```

---

## Dependency Injection

Dependency injection in Azure Functions Isolated Worker is identical to ASP.NET Core. The same rules and patterns apply.

### Rules

1. **Every class with behavior MUST depend on abstractions (interfaces), never concrete types.**
2. **Register services with the narrowest possible lifetime:**
   - `Singleton` — stateless, thread-safe services, HTTP client factories, caches.
   - `Scoped` — per-invocation state (each function invocation gets its own scope).
   - `Transient` — lightweight, stateless helpers.
3. **Never use the service locator pattern.** No manual `IServiceProvider.GetService<T>()` calls outside factory delegates.
4. **Group registrations into extension methods.**

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

### Configuration Binding

```csharp
// Configuration/CosmosSettings.cs
public sealed class CosmosSettings
{
    public const string SectionName = "Cosmos";
    public required string Endpoint { get; init; }
    public required string DatabaseName { get; init; }
    public required string ContainerName { get; init; }
}

// Registration in Program.cs
services.Configure<CosmosSettings>(
    context.Configuration.GetSection(CosmosSettings.SectionName));
```

### Important: Scoped Lifetime in Functions

Each function invocation creates a new DI scope automatically. `Scoped` services are per-invocation, which is the equivalent of per-request in ASP.NET Core. **Use `Scoped` for anything that holds per-invocation state** (database contexts, unit-of-work, etc.).

---

## Feature Flags

Feature flags MUST use `Microsoft.FeatureManagement`. All flag checks MUST be injectable and testable.

### Setup

```csharp
// Program.cs
services.AddFeatureManagement(
    context.Configuration.GetSection("FeatureManagement"));
```

### Defining Flags

```csharp
// FeatureFlags/FeatureFlags.cs
public static class FeatureFlags
{
    public const string EnableBulkOrders = "EnableBulkOrders";
    public const string UseNewPricingEngine = "UseNewPricingEngine";
    public const string EnableOrderExport = "EnableOrderExport";
}
```

### Configuration

In `local.settings.json` for local development:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "FeatureManagement__EnableBulkOrders": "true",
    "FeatureManagement__UseNewPricingEngine": "false"
  }
}
```

In Azure, use **Azure App Configuration** with feature flag management (preferred) or Application Settings.

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
            // new pricing logic
        }
        else
        {
            // existing pricing logic
        }
    }
}
```

### Usage in Functions (gate entire endpoints)

Since `[FeatureGate]` from ASP.NET Core MVC is not available in Azure Functions, gate at the function level:

```csharp
public class ExportOrdersFunction
{
    private readonly IFeatureManager _featureManager;
    private readonly IOrderService _orderService;

    public ExportOrdersFunction(IFeatureManager featureManager, IOrderService orderService)
    {
        _featureManager = featureManager;
        _orderService = orderService;
    }

    [Function("ExportOrders")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "orders/export")] HttpRequestData req)
    {
        if (!await _featureManager.IsEnabledAsync(FeatureFlags.EnableOrderExport))
        {
            var notFound = req.CreateResponse(HttpStatusCode.NotFound);
            return notFound;
        }

        var result = await _orderService.ExportOrdersAsync();
        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(result);
        return response;
    }
}
```

### Testing Feature Flags

```csharp
var featureManager = Substitute.For<IFeatureManager>();
featureManager.IsEnabledAsync(FeatureFlags.EnableOrderExport).Returns(false);

var sut = new ExportOrdersFunction(featureManager, mockOrderService);
var result = await sut.RunAsync(mockRequest);

result.StatusCode.Should().Be(HttpStatusCode.NotFound);
```

---

## Function Class Rules

Each function class represents ONE endpoint. Functions are thin HTTP boundary layers. They MUST NOT contain business logic.

### Template

```csharp
// Functions/Orders/CreateOrderFunction.cs
namespace MyApi.Functions.Functions.Orders;

public sealed class CreateOrderFunction
{
    private readonly IOrderService _orderService;
    private readonly IValidator<CreateOrderRequest> _validator;
    private readonly ILogger<CreateOrderFunction> _logger;

    public CreateOrderFunction(
        IOrderService orderService,
        IValidator<CreateOrderRequest> validator,
        ILogger<CreateOrderFunction> logger)
    {
        _orderService = orderService;
        _validator = validator;
        _logger = logger;
    }

    [Function("CreateOrder")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "orders")] HttpRequestData req)
    {
        var request = await req.ReadFromJsonAsync<CreateOrderRequest>();
        if (request is null)
        {
            return await CreateProblemResponse(req, HttpStatusCode.BadRequest, "Request body is required.");
        }

        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            return await CreateValidationProblemResponse(req, validation);
        }

        var result = await _orderService.CreateOrderAsync(request);

        var response = req.CreateResponse(HttpStatusCode.Created);
        response.Headers.Add("Location", $"/api/orders/{result.Id}");
        await response.WriteAsJsonAsync(result);
        return response;
    }

    private static async Task<HttpResponseData> CreateProblemResponse(
        HttpRequestData req, HttpStatusCode status, string detail)
    {
        var response = req.CreateResponse(status);
        await response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc9457",
            title = status.ToString(),
            status = (int)status,
            detail
        });
        return response;
    }

    private static async Task<HttpResponseData> CreateValidationProblemResponse(
        HttpRequestData req, FluentValidation.Results.ValidationResult validation)
    {
        var response = req.CreateResponse(HttpStatusCode.BadRequest);
        var errors = validation.Errors
            .GroupBy(e => e.PropertyName)
            .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

        await response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc9457",
            title = "Validation Failed",
            status = 400,
            errors
        });
        return response;
    }
}
```

### Function Checklist

- [ ] One function class per endpoint (single `[Function]` method per class).
- [ ] Class is `sealed`.
- [ ] Function method is named `RunAsync` and returns `Task<HttpResponseData>`.
- [ ] Route is RESTful: lowercase, plural nouns, no verbs (e.g., `"orders/{id:guid}"`).
- [ ] HTTP methods are explicitly specified in the trigger attribute.
- [ ] Request body is deserialized, null-checked, and validated before calling the service.
- [ ] Zero business logic — the function only calls a single service method and maps the result to an HTTP response.
- [ ] Error responses use ProblemDetails-style JSON (RFC 9457).
- [ ] Function name in `[Function("...")]` is unique across the entire Function App.
- [ ] XML doc comments on the function class and `RunAsync` method.

---

## OpenAPI / Swagger Specification

Azure Functions do not auto-generate an OpenAPI spec like ASP.NET Core controllers. You MUST explicitly configure OpenAPI support. This is critical for API discoverability, Azure API Management integration, client SDK generation, and developer portal documentation.

### Setup: Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore + NSwag

For the Isolated Worker model, the recommended approach is to use the ASP.NET Core integration with NSwag or a manual OpenAPI document.

**Option A: Using ASP.NET Core Integration (recommended for .NET 9+)**

If using `ConfigureFunctionsWebApplication()` (ASP.NET Core integration), you can leverage the same `Microsoft.AspNetCore.OpenApi` package as traditional ASP.NET Core:

```csharp
// Program.cs
var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(worker =>
    {
        // middleware registrations
    })
    .ConfigureServices((context, services) =>
    {
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, context, ct) =>
            {
                document.Info = new()
                {
                    Title = "My Functions API",
                    Version = "v1",
                    Description = "Order management serverless REST API."
                };
                return Task.CompletedTask;
            });
        });
    })
    .Build();
```

Then add the OpenAPI endpoint mapping:

```csharp
// If using ASP.NET Core integration, you can map OpenAPI in the app pipeline.
// For isolated worker, expose a dedicated function:
```

**Option B: Dedicated OpenAPI Function (works with any isolated worker setup)**

Create a function that serves a hand-maintained or generated OpenAPI JSON document:

```csharp
// Functions/OpenApi/GetOpenApiSpecFunction.cs
public sealed class GetOpenApiSpecFunction
{
    [Function("GetOpenApiSpec")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "openapi/v1.json")] HttpRequestData req)
    {
        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream("MyApi.Functions.openapi.json")
            ?? throw new InvalidOperationException("Embedded OpenAPI spec not found.");

        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");
        await stream.CopyToAsync(response.Body);
        return response;
    }
}
```

With this approach, maintain an `openapi.json` file as an embedded resource and keep it in sync with your endpoints. CI should validate the spec against the actual function routes.

**Option C: Azure API Management Auto-Import**

If the Function App sits behind Azure API Management (APIM), you can author the OpenAPI spec in APIM directly and import/sync your functions. This is common in enterprise setups where APIM is the public-facing gateway.

### XML Documentation for DTO Schema Descriptions

Regardless of which approach you use, all request/response DTOs MUST have XML doc comments so that schemas generated from the types are descriptive:

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
    /// One or more line items. Must contain at least one item.
    /// </summary>
    public required List<OrderLineItemRequest> LineItems { get; init; }
}

/// <summary>
/// A completed order with system-assigned identifiers and timestamps.
/// </summary>
public sealed class OrderResponse
{
    /// <summary>
    /// System-generated unique identifier for the order.
    /// </summary>
    /// <example>a1b2c3d4-e5f6-7890-abcd-ef1234567890</example>
    public required Guid Id { get; init; }

    /// <summary>
    /// Current status of the order.
    /// </summary>
    /// <example>Pending</example>
    public required string Status { get; init; }

    /// <summary>
    /// UTC timestamp when the order was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }
}
```

Enable XML documentation in the `.csproj`:

```xml
<PropertyGroup>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <NoWarn>$(NoWarn);1591</NoWarn>
</PropertyGroup>
```

### OpenAPI Checklist (Azure Functions)

- [ ] An OpenAPI spec (JSON or YAML) is available for the Function App — via endpoint, embedded resource, or APIM.
- [ ] The spec accurately lists every HTTP-triggered function with its route, HTTP methods, parameters, request body schema, and all response schemas.
- [ ] Authentication requirements (function keys, Bearer tokens, APIM subscription keys) are documented in the spec's `securitySchemes`.
- [ ] All request/response DTOs have XML doc comments with `<summary>` on every class and property.
- [ ] DTOs include `<example>` tags on key properties.
- [ ] `GenerateDocumentationFile` is enabled in the `.csproj`.
- [ ] CI validates the OpenAPI spec (e.g., using `spectral lint` or `swagger-cli validate`) on every build.
- [ ] If using Azure API Management, the spec is imported and version-synced with deployments.
- [ ] The spec includes `ProblemDetails`-style error response schemas for 400, 401, 403, 404, and 500 status codes.

---

## Middleware (Isolated Worker)

```csharp
// Middleware/ExceptionHandlingMiddleware.cs
public sealed class ExceptionHandlingMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> logger)
    {
        _logger = logger;
    }

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception in function {FunctionName}", context.FunctionDefinition.Name);

            var httpReqData = await context.GetHttpRequestDataAsync();
            if (httpReqData is not null)
            {
                var response = httpReqData.CreateResponse(HttpStatusCode.InternalServerError);
                await response.WriteAsJsonAsync(new
                {
                    type = "https://tools.ietf.org/html/rfc9457",
                    title = "Internal Server Error",
                    status = 500,
                    detail = "An unexpected error occurred."
                });

                context.GetInvocationResult().Value = response;
            }
        }
    }
}
```

### Correlation ID Middleware

```csharp
// Middleware/CorrelationIdMiddleware.cs
public sealed class CorrelationIdMiddleware : IFunctionsWorkerMiddleware
{
    private const string CorrelationIdHeader = "X-Correlation-Id";

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var httpReqData = await context.GetHttpRequestDataAsync();
        var correlationId = httpReqData?.Headers.TryGetValues(CorrelationIdHeader, out var values) == true
            ? values.First()
            : Guid.NewGuid().ToString();

        context.Items[CorrelationIdHeader] = correlationId;

        await next(context);

        if (context.GetInvocationResult().Value is HttpResponseData response)
        {
            response.Headers.Add(CorrelationIdHeader, correlationId);
        }
    }
}
```

---

## Validation

Use **FluentValidation** registered via DI. Validate in the function before calling the service.

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

Register all validators:

```csharp
services.AddValidatorsFromAssemblyContaining<Program>();
```

Inject `IValidator<T>` into function classes and call `ValidateAsync` before invoking the service.

---

## Logging & Observability

1. **Use `ILogger<T>` everywhere.** Never use `Console.WriteLine`, `Debug.WriteLine`, or static loggers.
2. **Use structured logging with message templates — never string interpolation.**

```csharp
// Correct
_logger.LogInformation("Order {OrderId} created for customer {CustomerId}", order.Id, order.CustomerId);

// Wrong
_logger.LogInformation($"Order {order.Id} created for customer {order.CustomerId}");
```

3. **Configure Application Insights for the isolated worker:**

```csharp
services.AddApplicationInsightsTelemetryWorkerService();
services.ConfigureFunctionsApplicationInsights();
```

4. **Set log levels in `host.json`:**

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      },
      "enableLiveMetrics": true
    },
    "logLevel": {
      "default": "Information",
      "Microsoft.Hosting.Lifetime": "Information",
      "Function": "Information"
    }
  }
}
```

---

## host.json Configuration

```json
{
  "version": "2.0",
  "extensions": {
    "http": {
      "routePrefix": "api",
      "maxOutstandingRequests": 200,
      "maxConcurrentRequests": 100
    }
  },
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "functionTimeout": "00:05:00"
}
```

---

## Testing Requirements

### Unit Tests

- Use **xUnit** as the test framework.
- Use **NSubstitute** for mocking interfaces.
- Use **FluentAssertions** for readable assertions.
- Test services, validators, and mappers in isolation.
- Feature flag behavior MUST be tested for both enabled and disabled states.

```csharp
[Fact]
public async Task CreateOrder_WhenNewPricingEnabled_UsesNewEngine()
{
    // Arrange
    var featureManager = Substitute.For<IFeatureManager>();
    featureManager.IsEnabledAsync(FeatureFlags.UseNewPricingEngine).Returns(true);
    var sut = new OrderService(featureManager, _mockRepo);

    // Act
    var result = await sut.CreateOrderAsync(request);

    // Assert
    result.PricingEngine.Should().Be("v2");
}
```

### Function-Level Tests

Mock `HttpRequestData` using a helper or library:

```csharp
[Fact]
public async Task CreateOrder_WhenBodyIsNull_Returns400()
{
    // Arrange
    var mockRequest = CreateMockHttpRequest(body: null);
    var sut = new CreateOrderFunction(
        Substitute.For<IOrderService>(),
        Substitute.For<IValidator<CreateOrderRequest>>(),
        Substitute.For<ILogger<CreateOrderFunction>>());

    // Act
    var result = await sut.RunAsync(mockRequest);

    // Assert
    result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
}
```

### Integration Tests

- Use the Functions test host or test the service layer independently against real dependencies (Cosmos emulator, Azurite, etc.).
- Feature flags should be overridden in test configuration.

### Test Naming

```
{MethodUnderTest}_{Scenario}_{ExpectedBehavior}
```

Example: `RunAsync_WhenFeatureFlagDisabled_Returns404`

---

## Azure Deployment Checklist

- [ ] Project targets .NET 9+ Isolated Worker model.
- [ ] `FUNCTIONS_WORKER_RUNTIME` is set to `dotnet-isolated`.
- [ ] Connection strings and secrets are stored in **Azure Key Vault** with Key Vault references in Application Settings.
- [ ] Managed Identity is enabled — no passwords or keys in configuration.
- [ ] Application Insights is connected.
- [ ] `host.json` has appropriate timeout and concurrency settings for the hosting plan.
- [ ] `local.settings.json` is in `.gitignore` and NEVER committed.
- [ ] Feature flags are managed via Azure App Configuration (preferred) or Application Settings.
- [ ] Function authorization level is set appropriately (`Function`, `Anonymous`, or `Admin`).
- [ ] CORS is configured in the Azure Portal or via `host.json` for browser clients.
- [ ] Each function has a unique, descriptive `[Function("Name")]`.
- [ ] OpenAPI specification is available (via function endpoint, embedded resource, or APIM import).
- [ ] CI validates the OpenAPI spec on every build.

---

## Key Differences from ASP.NET Core Controllers

| Concern | ASP.NET Core Controller | Azure Functions (Isolated) |
|---|---|---|
| Entry point | `Program.cs` with `WebApplicationBuilder` | `Program.cs` with `HostBuilder` |
| Routing | `[Route]` + `[HttpGet]` attributes on controller | `[HttpTrigger]` with `Route` parameter |
| Response type | `IActionResult` | `HttpResponseData` |
| DI scope | Per HTTP request | Per function invocation |
| Middleware | `IMiddleware` / `RequestDelegate` | `IFunctionsWorkerMiddleware` |
| Model binding | Automatic via `[FromBody]`, `[FromQuery]` | Manual: `req.ReadFromJsonAsync<T>()` |
| Validation | Auto via filter pipeline | Manual: inject `IValidator<T>` and call explicitly |
| Feature gate attribute | `[FeatureGate("Flag")]` on action | Check `IFeatureManager` in function body |
| Health checks | `MapHealthChecks("/health")` | Separate health-check function or App Service health probe |
| Error responses | `ProblemDetails` via middleware | Manual ProblemDetails-style JSON via `WriteAsJsonAsync` |
| OpenAPI/Swagger | Built-in via `Microsoft.AspNetCore.OpenApi` + `[ProducesResponseType]` | Manual: ASP.NET Core integration, embedded spec, or APIM import |

---

## Claude Code Instructions

When generating or modifying code in this project:

1. **Always use the Isolated Worker model.** Never generate in-process function code (no `FunctionName` attribute, no `IActionResult`, no `HttpRequest`).
2. **Always follow the project structure above.** One function class per file, grouped by resource under `Functions/`.
3. **Never put business logic in function classes.** If a function body exceeds 15 lines (excluding validation boilerplate), refactor into a service.
4. **Always inject `IFeatureManager`** when adding conditional behavior — never read `IConfiguration` directly for feature toggles.
5. **Every new function MUST include:**
   - Explicit HTTP method(s) in the trigger.
   - A RESTful route.
   - Request deserialization with null check.
   - FluentValidation for request bodies.
   - ProblemDetails-style error responses.
6. **Every new request/response DTO MUST include** XML doc comments on the class and every public property, with `<example>` tags on key fields. These feed the OpenAPI schema.
7. **Every new request DTO MUST have a matching FluentValidation validator.**
8. **Every new service MUST have a corresponding unit test class** with tests for happy path and at least one failure case.
9. **Feature flag tests MUST cover both enabled and disabled states.**
10. **Use structured logging message templates** — never string interpolation in log calls.
11. **Prefer `sealed` on all function and service classes.**
12. **Use `init` properties on DTOs and configuration classes for immutability.**
13. **Use `required` keyword on properties that must be set.**
14. **Do not suppress or catch exceptions silently.** All catch blocks must log.
15. **Use file-scoped namespaces** (`namespace MyApi.Functions.Services;`) in all files.
16. **Target .NET 9+** — use latest C# language features (primary constructors, collection expressions, etc.) where they improve clarity.
17. **Function method MUST be named `RunAsync`** and return `Task<HttpResponseData>`.
18. **When creating `HttpResponseData` error responses, always include a JSON body** — never return bare status codes without context.
19. **When adding a new function endpoint, update the OpenAPI spec** (whether it's a generated spec, embedded JSON, or APIM definition). Every new route, parameter, request body, and response type must be reflected in the spec. An undocumented endpoint is an incomplete endpoint.
