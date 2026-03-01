# Scaffold: Azure Functions Isolated Worker REST API

> **Instruction set for AI agents.** Follow every step in order. Do not skip any section — they are all required for a production-ready scaffold.

---

## 1 — Prerequisites & Targets

| Setting | Value |
|---|---|
| Runtime | .NET 9+ (latest LTS) |
| Hosting model | **Isolated Worker (out-of-process)** — the in-process model is deprecated and MUST NOT be used |
| Hosting plan | Azure Functions (Consumption, Premium, or Dedicated) |
| Trigger type | HTTP trigger functions acting as REST API endpoints |
| Validation | FluentValidation (no Data Annotations on DTOs) |
| Feature flags | `Microsoft.FeatureManagement` |
| Testing | xUnit + NSubstitute + FluentAssertions |
| OpenAPI | Embedded `openapi.json` served via a dedicated function (or ASP.NET Core integration if using `ConfigureFunctionsWebApplication`) |

### Critical: Isolated Worker Only

Every file you generate MUST target the Isolated Worker model. This means:

- Entry point is `Program.cs` with `HostBuilder` (not `WebApplicationBuilder`).
- Functions are plain C# classes — no inheritance from a base class.
- The trigger attribute is `[HttpTrigger]`, NOT the legacy `[FunctionName]` + `HttpRequest` pattern.
- The function attribute is `[Function("Name")]`, NOT `[FunctionName("Name")]`.
- Response type is `HttpResponseData`, NOT `IActionResult`.
- Request deserialization is manual (`req.ReadFromJsonAsync<T>()`), NOT automatic model binding.

---

## 2 — Create the Solution & Projects

```bash
dotnet new sln -n MyApi.Functions
dotnet new azurefunc -n MyApi.Functions -o src/MyApi.Functions --worker-runtime dotnet-isolated
dotnet new xunit -n MyApi.Functions.Tests -o src/MyApi.Functions.Tests
dotnet sln add src/MyApi.Functions/MyApi.Functions.csproj
dotnet sln add src/MyApi.Functions.Tests/MyApi.Functions.Tests.csproj
dotnet add src/MyApi.Functions.Tests reference src/MyApi.Functions
```

> **Replace `MyApi`** with the actual project name if the user provides one. Use that name consistently everywhere this document says `MyApi`.

---

## 3 — Install NuGet Packages

### MyApi.Functions (src/MyApi.Functions)

```bash
cd src/MyApi.Functions
dotnet add package Microsoft.Azure.Functions.Worker
dotnet add package Microsoft.Azure.Functions.Worker.Extensions.Http
dotnet add package Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore
dotnet add package Microsoft.Azure.Functions.Worker.Sdk
dotnet add package Microsoft.ApplicationInsights.WorkerService
dotnet add package Microsoft.FeatureManagement
dotnet add package FluentValidation
dotnet add package FluentValidation.DependencyInjectionExtensions
```

### MyApi.Functions.Tests (src/MyApi.Functions.Tests)

```bash
cd src/MyApi.Functions.Tests
dotnet add package NSubstitute
dotnet add package FluentAssertions
```

---

## 4 — Folder Structure

Create the following directory tree exactly. Every directory listed is required even if it starts empty — it signals intent and keeps the project structure consistent.

```
src/
├── MyApi.Functions/
│   ├── Functions/                # HTTP-triggered function classes (grouped by resource)
│   │   └── Samples/             # Starter resource — rename or delete later
│   ├── Models/
│   │   ├── Requests/
│   │   ├── Responses/
│   │   └── Domain/
│   ├── Services/
│   ├── Repositories/
│   ├── Middleware/
│   ├── Extensions/
│   ├── Configuration/
│   ├── FeatureFlags/
│   ├── Validators/
│   ├── Mappers/
│   ├── Program.cs
│   ├── host.json
│   └── local.settings.json
├── MyApi.Functions.Tests/
│   ├── Unit/
│   ├── Integration/
│   └── Fixtures/
└── MyApi.Functions.sln
```

Create every missing directory with `mkdir -p` (or equivalent). Do not collapse or rename any folder.

---

## 5 — Naming Conventions

Apply these conventions to every file you generate. They are non-negotiable.

| Artifact | Convention | Example |
|---|---|---|
| Function class | `{Action}{Resource}Function` | `CreateOrderFunction` |
| Function method | `RunAsync` | Always `RunAsync` |
| Function name attribute | `{Action}{Resource}` | `[Function("CreateOrder")]` |
| Route | RESTful, lowercase, plural nouns | `"orders/{id:guid}"` |
| Service interface | `I{Name}Service` | `IOrderService` |
| Service implementation | `{Name}Service` | `OrderService` |
| Repository interface | `I{Name}Repository` | `IOrderRepository` |
| Request DTO | `{Action}{Resource}Request` | `CreateOrderRequest` |
| Response DTO | `{Resource}Response` | `OrderResponse` |
| Validator | `{DtoName}Validator` | `CreateOrderRequestValidator` |
| Configuration class | `{Feature}Settings` | `CacheSettings` |
| Feature flag constant | `{Feature}Flag` string | `"EnableBulkOrders"` |
| Test class | `{ClassUnderTest}Tests` | `CreateOrderFunctionTests` |
| Test method | `{Method}_{Scenario}_{Expected}` | `RunAsync_WhenBodyNull_Returns400` |

---

## 6 — Global Code Style Rules

Apply these rules to **every** `.cs` file in the scaffold:

1. Use **file-scoped namespaces** (`namespace MyApi.Functions.Services;`).
2. Mark all classes `sealed` unless explicitly designed for inheritance.
3. Use `init` properties on DTOs and configuration classes for immutability.
4. Use `required` keyword on DTO properties that must always be set.
5. All async methods must accept and forward `CancellationToken` where the API supports it (services, repositories). Function `RunAsync` methods do not receive a `CancellationToken` from the trigger but should forward one to services where possible.
6. Use latest C# language features (primary constructors, collection expressions) where they improve clarity.
7. Never use `Console.WriteLine` or `Debug.WriteLine` — use `ILogger<T>` everywhere.
8. Use structured logging message templates — **never** string interpolation in log calls.
9. Never suppress or catch exceptions silently. Every `catch` block must log.
10. Constructor injection only. Never use the service locator pattern (`IServiceProvider.GetService`) outside factory delegates.
11. Function method MUST be named `RunAsync` and return `Task<HttpResponseData>`.
12. One function class per endpoint. One `[Function]` method per class.
13. Error responses MUST always include a JSON body (ProblemDetails-style) — never return bare status codes.

---

## 7 — Enable XML Documentation

Add to `src/MyApi.Functions/MyApi.Functions.csproj` inside the main `<PropertyGroup>`:

```xml
<GenerateDocumentationFile>true</GenerateDocumentationFile>
<NoWarn>$(NoWarn);1591</NoWarn>
```

---

## 8 — Configuration Classes

### 8.1 — Example Strongly-Typed Config

Create `src/MyApi.Functions/Configuration/CacheSettings.cs`:

```csharp
namespace MyApi.Functions.Configuration;

/// <summary>
/// Settings for caching behavior.
/// </summary>
public sealed class CacheSettings
{
    public const string SectionName = "Cache";

    /// <summary>Default cache expiration in minutes.</summary>
    public int DefaultExpirationMinutes { get; init; } = 5;

    /// <summary>Whether caching is enabled.</summary>
    public bool Enabled { get; init; } = true;
}
```

---

## 9 — Feature Flags

Create `src/MyApi.Functions/FeatureFlags/FeatureFlags.cs`:

```csharp
namespace MyApi.Functions.FeatureFlags;

/// <summary>
/// Centralized feature flag constants. Every flag name used in the codebase MUST be defined here.
/// </summary>
public static class FeatureFlags
{
    public const string EnableSampleEndpoint = "EnableSampleEndpoint";
}
```

All flag checks MUST go through `IFeatureManager` — never read `IConfiguration` booleans directly for feature toggles.

Since `[FeatureGate]` is not available in Azure Functions, gate entire endpoints by checking `IFeatureManager.IsEnabledAsync` at the top of `RunAsync` and returning a `404 NotFound` response if the flag is disabled.

---

## 10 — Middleware

### 10.1 — Correlation ID Middleware

Create `src/MyApi.Functions/Middleware/CorrelationIdMiddleware.cs`:

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;

namespace MyApi.Functions.Middleware;

/// <summary>
/// Reads or generates an X-Correlation-Id header and attaches it to the function context and response.
/// </summary>
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

### 10.2 — Global Exception Handling Middleware

Create `src/MyApi.Functions/Middleware/ExceptionHandlingMiddleware.cs`:

```csharp
using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;

namespace MyApi.Functions.Middleware;

/// <summary>
/// Catches all unhandled exceptions and returns a RFC 9457 ProblemDetails-style JSON response.
/// Never returns raw exception messages to clients.
/// </summary>
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
            _logger.LogError(ex, "Unhandled exception in function {FunctionName}",
                context.FunctionDefinition.Name);

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

---

## 11 — Extension Methods

Create `src/MyApi.Functions/Extensions/ServiceCollectionExtensions.cs`:

```csharp
using FluentValidation;
using MyApi.Functions.Configuration;

namespace MyApi.Functions.Extensions;

/// <summary>
/// Groups all DI registrations for readability in Program.cs.
/// </summary>
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Register services and repositories here as the project grows:
        // services.AddScoped<IOrderService, OrderService>();
        // services.AddScoped<IOrderRepository, OrderRepository>();
        return services;
    }

    public static IServiceCollection AddApplicationConfiguration(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<CacheSettings>(
            configuration.GetSection(CacheSettings.SectionName));
        return services;
    }

    public static IServiceCollection AddApplicationValidation(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<Program>();
        return services;
    }
}
```

---

## 12 — Program.cs (Composition Root)

Replace the generated `Program.cs` with the following. This is the single source of truth for DI and middleware ordering.

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.FeatureManagement;
using MyApi.Functions.Extensions;
using MyApi.Functions.Middleware;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(worker =>
    {
        worker.UseMiddleware<CorrelationIdMiddleware>();
        worker.UseMiddleware<ExceptionHandlingMiddleware>();
    })
    .ConfigureServices((context, services) =>
    {
        // Application Insights
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        // Feature management
        services.AddFeatureManagement(
            context.Configuration.GetSection("FeatureManagement"));

        // Application services, config, and validation
        services.AddApplicationServices();
        services.AddApplicationConfiguration(context.Configuration);
        services.AddApplicationValidation();
    })
    .Build();

host.Run();

// Make Program class accessible for test projects
public partial class Program { }
```

---

## 13 — host.json

Replace `src/MyApi.Functions/host.json`:

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
      },
      "enableLiveMetrics": true
    },
    "logLevel": {
      "default": "Information",
      "Microsoft.Hosting.Lifetime": "Information",
      "Function": "Information"
    }
  },
  "functionTimeout": "00:05:00"
}
```

---

## 14 — local.settings.json

Replace `src/MyApi.Functions/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "FeatureManagement__EnableSampleEndpoint": "true",
    "Cache__DefaultExpirationMinutes": "5",
    "Cache__Enabled": "true"
  }
}
```

> **CRITICAL:** Add `local.settings.json` to `.gitignore`. It MUST NEVER be committed with secrets.

Add to `.gitignore` (create if it doesn't exist):

```
local.settings.json
```

---

## 15 — Shared ProblemDetails Helpers

Function classes need to produce ProblemDetails-style JSON manually. Create a shared helper to avoid duplication across every function.

Create `src/MyApi.Functions/Extensions/HttpResponseExtensions.cs`:

```csharp
using System.Net;
using FluentValidation.Results;
using Microsoft.Azure.Functions.Worker.Http;

namespace MyApi.Functions.Extensions;

/// <summary>
/// Extension methods for building ProblemDetails-style HTTP responses from Azure Functions.
/// </summary>
public static class HttpResponseExtensions
{
    /// <summary>
    /// Creates a ProblemDetails JSON error response (RFC 9457).
    /// </summary>
    public static async Task<HttpResponseData> CreateProblemResponseAsync(
        this HttpRequestData req,
        HttpStatusCode status,
        string detail)
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

    /// <summary>
    /// Creates a validation ProblemDetails response from FluentValidation results.
    /// </summary>
    public static async Task<HttpResponseData> CreateValidationProblemResponseAsync(
        this HttpRequestData req,
        ValidationResult validation)
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

---

## 16 — Sample Resource (Starter Function Stack)

Generate a complete vertical slice for a sample resource so the developer has a working reference. Use "Sample" as the resource name.

### 16.1 — Request DTO

`src/MyApi.Functions/Models/Requests/CreateSampleRequest.cs`

```csharp
namespace MyApi.Functions.Models.Requests;

/// <summary>
/// Payload for creating a new sample resource.
/// </summary>
public sealed class CreateSampleRequest
{
    /// <summary>
    /// Display name of the sample resource.
    /// </summary>
    /// <example>My First Sample</example>
    public required string Name { get; init; }

    /// <summary>
    /// Optional description.
    /// </summary>
    /// <example>A short description of the resource.</example>
    public string? Description { get; init; }
}
```

### 16.2 — Response DTO

`src/MyApi.Functions/Models/Responses/SampleResponse.cs`

```csharp
namespace MyApi.Functions.Models.Responses;

/// <summary>
/// Represents a sample resource returned by the API.
/// </summary>
public sealed class SampleResponse
{
    /// <summary>Unique identifier.</summary>
    /// <example>3fa85f64-5717-4562-b3fc-2c963f66afa6</example>
    public required Guid Id { get; init; }

    /// <summary>Display name.</summary>
    /// <example>My First Sample</example>
    public required string Name { get; init; }

    /// <summary>Optional description.</summary>
    public string? Description { get; init; }

    /// <summary>UTC timestamp when the resource was created.</summary>
    public required DateTime CreatedAtUtc { get; init; }
}
```

### 16.3 — Validator

`src/MyApi.Functions/Validators/CreateSampleRequestValidator.cs`

```csharp
using FluentValidation;
using MyApi.Functions.Models.Requests;

namespace MyApi.Functions.Validators;

/// <summary>
/// Validates the <see cref="CreateSampleRequest"/> payload.
/// </summary>
public sealed class CreateSampleRequestValidator : AbstractValidator<CreateSampleRequest>
{
    public CreateSampleRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);
    }
}
```

### 16.4 — Service Interface & Implementation

`src/MyApi.Functions/Services/ISampleService.cs`

```csharp
using MyApi.Functions.Models.Requests;
using MyApi.Functions.Models.Responses;

namespace MyApi.Functions.Services;

public interface ISampleService
{
    Task<SampleResponse> CreateAsync(CreateSampleRequest request, CancellationToken cancellationToken);
    Task<SampleResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
}
```

`src/MyApi.Functions/Services/SampleService.cs`

```csharp
using Microsoft.Extensions.Logging;
using MyApi.Functions.Models.Requests;
using MyApi.Functions.Models.Responses;

namespace MyApi.Functions.Services;

/// <summary>
/// Business logic for the Sample resource.
/// Replace the in-memory store with a repository when a database is added.
/// </summary>
public sealed class SampleService : ISampleService
{
    private readonly ILogger<SampleService> _logger;
    private static readonly Dictionary<Guid, SampleResponse> Store = new();

    public SampleService(ILogger<SampleService> logger)
    {
        _logger = logger;
    }

    public Task<SampleResponse> CreateAsync(CreateSampleRequest request, CancellationToken cancellationToken)
    {
        var response = new SampleResponse
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            CreatedAtUtc = DateTime.UtcNow
        };

        Store[response.Id] = response;
        _logger.LogInformation("Sample {SampleId} created with name {Name}", response.Id, response.Name);
        return Task.FromResult(response);
    }

    public Task<SampleResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        Store.TryGetValue(id, out var result);
        return Task.FromResult(result);
    }
}
```

**Register the service** — add to `ServiceCollectionExtensions.AddApplicationServices`:

```csharp
services.AddScoped<ISampleService, SampleService>();
```

### 16.5 — Create Function

`src/MyApi.Functions/Functions/Samples/CreateSampleFunction.cs`

```csharp
using System.Net;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using MyApi.Functions.Extensions;
using MyApi.Functions.Models.Requests;
using MyApi.Functions.Services;

namespace MyApi.Functions.Functions.Samples;

/// <summary>
/// Creates a new sample resource.
/// </summary>
public sealed class CreateSampleFunction
{
    private readonly ISampleService _sampleService;
    private readonly IValidator<CreateSampleRequest> _validator;
    private readonly ILogger<CreateSampleFunction> _logger;

    public CreateSampleFunction(
        ISampleService sampleService,
        IValidator<CreateSampleRequest> validator,
        ILogger<CreateSampleFunction> logger)
    {
        _sampleService = sampleService;
        _validator = validator;
        _logger = logger;
    }

    /// <summary>
    /// Creates a new sample resource.
    /// </summary>
    /// <returns>201 Created with the new resource, or 400 if validation fails.</returns>
    [Function("CreateSample")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "samples")] HttpRequestData req)
    {
        var request = await req.ReadFromJsonAsync<CreateSampleRequest>();
        if (request is null)
        {
            return await req.CreateProblemResponseAsync(
                HttpStatusCode.BadRequest, "Request body is required.");
        }

        var validation = await _validator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            return await req.CreateValidationProblemResponseAsync(validation);
        }

        var result = await _sampleService.CreateAsync(request, CancellationToken.None);

        var response = req.CreateResponse(HttpStatusCode.Created);
        response.Headers.Add("Location", $"/api/samples/{result.Id}");
        await response.WriteAsJsonAsync(result);
        return response;
    }
}
```

### 16.6 — Get Function

`src/MyApi.Functions/Functions/Samples/GetSampleFunction.cs`

```csharp
using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using MyApi.Functions.Extensions;
using MyApi.Functions.Services;

namespace MyApi.Functions.Functions.Samples;

/// <summary>
/// Retrieves a sample resource by its unique identifier.
/// </summary>
public sealed class GetSampleFunction
{
    private readonly ISampleService _sampleService;
    private readonly ILogger<GetSampleFunction> _logger;

    public GetSampleFunction(
        ISampleService sampleService,
        ILogger<GetSampleFunction> logger)
    {
        _sampleService = sampleService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves a sample resource by ID.
    /// </summary>
    /// <returns>200 OK with the resource, or 404 if not found.</returns>
    [Function("GetSample")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "samples/{id:guid}")] HttpRequestData req,
        Guid id)
    {
        var result = await _sampleService.GetByIdAsync(id, CancellationToken.None);

        if (result is null)
        {
            return await req.CreateProblemResponseAsync(
                HttpStatusCode.NotFound, $"Sample with id '{id}' was not found.");
        }

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(result);
        return response;
    }
}
```

---

## 17 — Sample Unit Tests

### 17.1 — Service Tests

Create `src/MyApi.Functions.Tests/Unit/SampleServiceTests.cs`:

```csharp
using FluentAssertions;
using Microsoft.Extensions.Logging;
using MyApi.Functions.Models.Requests;
using MyApi.Functions.Services;
using NSubstitute;

namespace MyApi.Functions.Tests.Unit;

public sealed class SampleServiceTests
{
    private readonly SampleService _sut;

    public SampleServiceTests()
    {
        var logger = Substitute.For<ILogger<SampleService>>();
        _sut = new SampleService(logger);
    }

    [Fact]
    public async Task CreateAsync_WhenValidRequest_ReturnsResponseWithId()
    {
        // Arrange
        var request = new CreateSampleRequest { Name = "Test", Description = "Desc" };

        // Act
        var result = await _sut.CreateAsync(request, CancellationToken.None);

        // Assert
        result.Id.Should().NotBeEmpty();
        result.Name.Should().Be("Test");
        result.Description.Should().Be("Desc");
        result.CreatedAtUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotFound_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByIdAsync(Guid.NewGuid(), CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }
}
```

### 17.2 — Validator Tests

Create `src/MyApi.Functions.Tests/Unit/CreateSampleRequestValidatorTests.cs`:

```csharp
using FluentAssertions;
using MyApi.Functions.Models.Requests;
using MyApi.Functions.Validators;

namespace MyApi.Functions.Tests.Unit;

public sealed class CreateSampleRequestValidatorTests
{
    private readonly CreateSampleRequestValidator _sut = new();

    [Fact]
    public void Validate_WhenNameEmpty_HasError()
    {
        var request = new CreateSampleRequest { Name = "" };
        var result = _sut.Validate(request);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Name");
    }

    [Fact]
    public void Validate_WhenNameValid_IsValid()
    {
        var request = new CreateSampleRequest { Name = "Valid Name" };
        var result = _sut.Validate(request);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WhenNameExceedsMaxLength_HasError()
    {
        var request = new CreateSampleRequest { Name = new string('x', 201) };
        var result = _sut.Validate(request);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Name");
    }
}
```

---

## 18 — Test Fixtures: Mock HttpRequestData Helper

Azure Functions `HttpRequestData` is abstract and requires a helper to mock. Create this shared fixture so all function-level tests can use it.

Create `src/MyApi.Functions.Tests/Fixtures/MockHttpRequestData.cs`:

```csharp
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using NSubstitute;

namespace MyApi.Functions.Tests.Fixtures;

/// <summary>
/// Helper for creating mock HttpRequestData instances in unit tests.
/// </summary>
public static class MockHttpRequestData
{
    public static HttpRequestData Create(
        object? body = null,
        string method = "GET",
        string url = "http://localhost/api/test")
    {
        var context = Substitute.For<FunctionContext>();
        var serviceProvider = Substitute.For<IServiceProvider>();
        context.InstanceServices.Returns(serviceProvider);

        var request = Substitute.For<HttpRequestData>(context);
        request.Url.Returns(new Uri(url));
        request.Method.Returns(method);
        request.Headers.Returns(new HttpHeadersCollection());

        if (body is not null)
        {
            var json = JsonSerializer.Serialize(body);
            var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));
            request.Body.Returns(stream);
        }
        else
        {
            request.Body.Returns(new MemoryStream());
        }

        request.CreateResponse().Returns(callInfo =>
        {
            var response = Substitute.For<HttpResponseData>(context);
            response.StatusCode = HttpStatusCode.OK;
            response.Body = new MemoryStream();
            response.Headers.Returns(new HttpHeadersCollection());
            return response;
        });

        return request;
    }
}
```

---

## 19 — Post-Scaffold Verification

After generating all files, run these commands and confirm they pass:

```bash
dotnet build MyApi.Functions.sln
dotnet test MyApi.Functions.sln

# Start the function app locally (requires Azure Functions Core Tools)
cd src/MyApi.Functions
func start

# In another terminal:
curl http://localhost:7071/api/samples -X POST -H "Content-Type: application/json" -d '{"name":"Test"}'
curl http://localhost:7071/api/samples/{id-from-above}
```

---

## 20 — Post-Scaffold Checklist

Verify every item before marking the scaffold complete:

- [ ] Solution builds with zero errors and zero warnings.
- [ ] All unit tests pass.
- [ ] `local.settings.json` is in `.gitignore`.
- [ ] `host.json` has `routePrefix`, timeout, and logging configured.
- [ ] `FUNCTIONS_WORKER_RUNTIME` is set to `dotnet-isolated` in `local.settings.json`.
- [ ] Every function class has one `[Function]` attribute with a unique name.
- [ ] Every function method is named `RunAsync` and returns `Task<HttpResponseData>`.
- [ ] HTTP methods are explicitly specified in `[HttpTrigger]`.
- [ ] Routes are RESTful (lowercase, plural nouns, no verbs).
- [ ] Request bodies are deserialized, null-checked, and validated before calling services.
- [ ] All error responses include ProblemDetails-style JSON bodies.
- [ ] Every DTO class and property has `<summary>` XML docs; key properties have `<example>` tags.
- [ ] Every request DTO has a matching FluentValidation validator.
- [ ] Every service is registered in DI via an extension method.
- [ ] `GenerateDocumentationFile` is enabled in the `.csproj`.
- [ ] No business logic exists in any function class.
- [ ] All classes are `sealed` unless designed for inheritance.
- [ ] Structured logging only — no string interpolation in log calls.
- [ ] Feature flags use `IFeatureManager`, not raw `IConfiguration`.
- [ ] Middleware for correlation ID and exception handling is registered in `Program.cs`.

---

## 21 — Adding a New Resource (Ongoing Instructions)

When the developer asks you to add a new resource (e.g., "add an Orders endpoint"), generate ALL of the following:

1. **Request DTO** in `Models/Requests/` with XML docs and `<example>` tags.
2. **Response DTO** in `Models/Responses/` with XML docs and `<example>` tags.
3. **FluentValidation validator** in `Validators/`.
4. **Service interface** in `Services/`.
5. **Service implementation** in `Services/` (sealed, with `ILogger<T>`).
6. **One function class per HTTP action** in `Functions/{Resource}/` (sealed, injects service + validator + logger, validates before calling service, returns ProblemDetails on error).
7. **DI registration** — add to or create an extension method in `Extensions/`.
8. **Unit tests** — at least happy path + one failure case for the service, and validation tests for the validator.
9. **Update the OpenAPI spec** — if an `openapi.json` exists, add the new routes, schemas, and response types.

Never generate a partial stack. Every resource must have the complete vertical slice above.

### Key Differences from ASP.NET Core Controller Scaffold

If you have also seen the ASP.NET Core controller scaffold instructions, note these critical differences:

| Concern | ASP.NET Core Controller | Azure Functions (Isolated) |
|---|---|---|
| Entry point | `WebApplicationBuilder` | `HostBuilder` |
| Routing | `[Route]` + `[HttpGet]` on controller | `[HttpTrigger]` with `Route` param |
| Response type | `IActionResult` | `HttpResponseData` |
| Model binding | Automatic `[FromBody]` | Manual `req.ReadFromJsonAsync<T>()` |
| Validation | Auto via filter pipeline | Manual: inject `IValidator<T>`, call explicitly |
| Error responses | `ProblemDetails` via middleware | Manual ProblemDetails JSON via shared helpers |
| One class per... | Resource (multiple actions) | Endpoint (one `RunAsync` per class) |
| Feature gating | `[FeatureGate]` attribute | Check `IFeatureManager` in function body |
