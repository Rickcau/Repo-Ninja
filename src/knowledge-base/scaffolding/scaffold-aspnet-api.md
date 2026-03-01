# Scaffold: ASP.NET Core Controller REST API

> **Instruction set for AI agents.** Follow every step in order. Do not skip optional sections — they are all required for a production-ready scaffold.

---

## 1 — Prerequisites & Targets

| Setting | Value |
|---|---|
| Runtime | .NET 9+ (latest LTS) |
| Hosting target | Azure App Service (Windows or Linux) |
| API style | Traditional controllers (`[ApiController]`) — **not** Minimal APIs |
| Auth scheme | JWT Bearer (scaffold the plumbing; leave issuer/audience configurable) |
| Validation | FluentValidation (no Data Annotations on DTOs) |
| Feature flags | `Microsoft.FeatureManagement` |
| Testing | xUnit + NSubstitute + FluentAssertions |
| OpenAPI | `Microsoft.AspNetCore.OpenApi` (.NET 9 built-in) + `Swashbuckle.AspNetCore.SwaggerUI` for dev UI |

---

## 2 — Create the Solution & Projects

```bash
dotnet new sln -n MyApi
dotnet new webapi -n MyApi -o src/MyApi --use-controllers
dotnet new xunit -n MyApi.Tests -o src/MyApi.Tests
dotnet sln add src/MyApi/MyApi.csproj
dotnet sln add src/MyApi.Tests/MyApi.Tests.csproj
dotnet add src/MyApi.Tests reference src/MyApi
```

> **Replace `MyApi`** with the actual project name if the user provides one. Use that name consistently everywhere this document says `MyApi`.

---

## 3 — Install NuGet Packages

### MyApi (src/MyApi)

```bash
cd src/MyApi
dotnet add package Microsoft.AspNetCore.OpenApi
dotnet add package Swashbuckle.AspNetCore.SwaggerUI
dotnet add package Microsoft.FeatureManagement.AspNetCore
dotnet add package FluentValidation.AspNetCore
dotnet add package Microsoft.ApplicationInsights.AspNetCore
dotnet add package AspNetCore.HealthChecks.UI.Client
dotnet add package AutoMapper.Extensions.Microsoft.DependencyInjection
```

### MyApi.Tests (src/MyApi.Tests)

```bash
cd src/MyApi.Tests
dotnet add package NSubstitute
dotnet add package FluentAssertions
dotnet add package Microsoft.AspNetCore.Mvc.Testing
```

---

## 4 — Folder Structure

Create the following directory tree exactly. Every directory listed is required even if it starts empty — it signals intent and keeps the project structure consistent.

```
src/
├── MyApi/
│   ├── Controllers/
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
│   └── Program.cs
├── MyApi.Tests/
│   ├── Unit/
│   ├── Integration/
│   └── Fixtures/
└── MyApi.sln
```

Create every missing directory with `mkdir -p` (or equivalent). Do not collapse or rename any folder.

---

## 5 — Naming Conventions

Apply these conventions to every file you generate. They are non-negotiable.

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
| Feature flag constant | `{Feature}Flag` string | `"EnableBulkOrders"` |
| Test class | `{ClassUnderTest}Tests` | `OrderServiceTests` |
| Test method | `{Method}_{Scenario}_{Expected}` | `CreateOrderAsync_WhenValid_ReturnsCreated` |

---

## 6 — Global Code Style Rules

Apply these rules to **every** `.cs` file in the scaffold:

1. Use **file-scoped namespaces** (`namespace MyApi.Services;`).
2. Mark all classes `sealed` unless explicitly designed for inheritance.
3. Use `init` properties on DTOs and configuration classes for immutability.
4. Use `required` keyword on DTO properties that must always be set.
5. All async methods must accept and forward `CancellationToken` as the last parameter.
6. Use latest C# language features (primary constructors, collection expressions) where they improve clarity.
7. Never use `Console.WriteLine` — use `ILogger<T>` everywhere.
8. Use structured logging message templates — **never** string interpolation in log calls.
9. Never suppress or catch exceptions silently. Every `catch` block must log.
10. Constructor injection only. Never use the service locator pattern (`IServiceProvider.GetService`) outside factory delegates.

---

## 7 — Enable XML Documentation

Add to `src/MyApi/MyApi.csproj` inside the main `<PropertyGroup>`:

```xml
<GenerateDocumentationFile>true</GenerateDocumentationFile>
<NoWarn>$(NoWarn);1591</NoWarn>
```

---

## 8 — Configuration Classes

### 8.1 — Cache Settings (example strongly-typed config)

Create `src/MyApi/Configuration/CacheSettings.cs`:

```csharp
namespace MyApi.Configuration;

/// <summary>
/// Settings for response caching behavior.
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

Create `src/MyApi/FeatureFlags/FeatureFlags.cs`:

```csharp
namespace MyApi.FeatureFlags;

/// <summary>
/// Centralized feature flag constants. Every flag name used in the codebase MUST be defined here.
/// </summary>
public static class FeatureFlags
{
    public const string EnableSampleEndpoint = "EnableSampleEndpoint";
}
```

Add to `appsettings.json`:

```json
{
  "FeatureManagement": {
    "EnableSampleEndpoint": true
  }
}
```

All flag checks MUST go through `IFeatureManager` — never read `IConfiguration` booleans directly for feature toggles.

---

## 10 — Middleware

### 10.1 — Correlation ID Middleware

Create `src/MyApi/Middleware/CorrelationIdMiddleware.cs`:

```csharp
namespace MyApi.Middleware;

/// <summary>
/// Reads or generates an X-Correlation-Id header and pushes it into the log scope.
/// </summary>
public sealed class CorrelationIdMiddleware
{
    private const string Header = "X-Correlation-Id";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ILogger<CorrelationIdMiddleware> logger)
    {
        var correlationId = context.Request.Headers[Header].FirstOrDefault()
                            ?? Guid.NewGuid().ToString();

        context.Response.Headers[Header] = correlationId;

        using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
        {
            await _next(context);
        }
    }
}
```

### 10.2 — Global Exception Middleware

Create `src/MyApi/Middleware/GlobalExceptionMiddleware.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;

namespace MyApi.Middleware;

/// <summary>
/// Catches all unhandled exceptions and returns a RFC 9457 ProblemDetails response.
/// Never returns raw exception messages to clients.
/// </summary>
public sealed class GlobalExceptionMiddleware
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

---

## 11 — Extension Methods

### 11.1 — Service Collection Extensions

Create `src/MyApi/Extensions/ServiceCollectionExtensions.cs`:

```csharp
using FluentValidation;
using MyApi.Configuration;

namespace MyApi.Extensions;

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

### 11.2 — Application Builder Extensions

Create `src/MyApi/Extensions/ApplicationBuilderExtensions.cs`:

```csharp
using MyApi.Middleware;

namespace MyApi.Extensions;

/// <summary>
/// Groups middleware pipeline registrations for readability in Program.cs.
/// </summary>
public static class ApplicationBuilderExtensions
{
    public static IApplicationBuilder UseApplicationMiddleware(this IApplicationBuilder app)
    {
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseMiddleware<GlobalExceptionMiddleware>();
        return app;
    }
}
```

---

## 12 — Program.cs (Composition Root)

Replace the generated `Program.cs` with the following. This is the single source of truth for DI and middleware ordering.

```csharp
using Microsoft.FeatureManagement;
using MyApi.Extensions;

var builder = WebApplication.CreateBuilder(args);

// --- Service registrations ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// OpenAPI (.NET 9 built-in)
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, ct) =>
    {
        document.Info = new()
        {
            Title = "MyApi",
            Version = "v1",
            Description = "REST API scaffold — replace this description.",
            Contact = new() { Name = "Team", Email = "team@example.com" }
        };
        return Task.CompletedTask;
    });
});

// Feature management
builder.Services.AddFeatureManagement(
    builder.Configuration.GetSection("FeatureManagement"));

// Application services, config, and validation
builder.Services.AddApplicationServices();
builder.Services.AddApplicationConfiguration(builder.Configuration);
builder.Services.AddApplicationValidation();

// AutoMapper
builder.Services.AddAutoMapper(typeof(Program));

// Health checks
builder.Services.AddHealthChecks();

// Application Insights
builder.Services.AddApplicationInsightsTelemetry();

var app = builder.Build();

// --- Middleware pipeline (order matters) ---
app.UseApplicationMiddleware();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "MyApi v1");
    });
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

// Make Program class accessible for WebApplicationFactory in integration tests
public partial class Program { }
```

---

## 13 — Sample Resource (Starter Controller Stack)

Generate a complete vertical slice for a sample resource so the developer has a working reference. Use "Sample" as the resource name. The user can rename or delete it later.

### 13.1 — Request DTO

`src/MyApi/Models/Requests/CreateSampleRequest.cs`

```csharp
namespace MyApi.Models.Requests;

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

### 13.2 — Response DTO

`src/MyApi/Models/Responses/SampleResponse.cs`

```csharp
namespace MyApi.Models.Responses;

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

### 13.3 — Validator

`src/MyApi/Validators/CreateSampleRequestValidator.cs`

```csharp
using FluentValidation;
using MyApi.Models.Requests;

namespace MyApi.Validators;

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

### 13.4 — Service Interface & Implementation

`src/MyApi/Services/ISampleService.cs`

```csharp
using MyApi.Models.Requests;
using MyApi.Models.Responses;

namespace MyApi.Services;

public interface ISampleService
{
    Task<SampleResponse> CreateAsync(CreateSampleRequest request, CancellationToken cancellationToken);
    Task<SampleResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
}
```

`src/MyApi/Services/SampleService.cs`

```csharp
using MyApi.Models.Requests;
using MyApi.Models.Responses;

namespace MyApi.Services;

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

### 13.5 — Controller

`src/MyApi/Controllers/SamplesController.cs`

```csharp
using Microsoft.AspNetCore.Mvc;
using MyApi.Models.Requests;
using MyApi.Models.Responses;
using MyApi.Services;

namespace MyApi.Controllers;

/// <summary>
/// Manages sample resources. Use as a reference for building new controllers.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public sealed class SamplesController : ControllerBase
{
    private readonly ISampleService _sampleService;
    private readonly ILogger<SamplesController> _logger;

    public SamplesController(ISampleService sampleService, ILogger<SamplesController> logger)
    {
        _sampleService = sampleService;
        _logger = logger;
    }

    /// <summary>
    /// Creates a new sample resource.
    /// </summary>
    /// <param name="request">The creation payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The newly created sample resource.</returns>
    /// <response code="201">Resource created successfully.</response>
    /// <response code="400">Validation failed. See ProblemDetails for errors.</response>
    /// <response code="500">Unexpected server error.</response>
    [HttpPost]
    [ProducesResponseType(typeof(SampleResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CreateSample(
        [FromBody] CreateSampleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _sampleService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetSample), new { id = result.Id }, result);
    }

    /// <summary>
    /// Retrieves a sample resource by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the resource.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The matching sample resource.</returns>
    /// <response code="200">Resource found.</response>
    /// <response code="404">Resource not found.</response>
    /// <response code="500">Unexpected server error.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SampleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetSample(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _sampleService.GetByIdAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
```

---

## 14 — Sample Unit Tests

Create `src/MyApi.Tests/Unit/SampleServiceTests.cs`:

```csharp
using FluentAssertions;
using Microsoft.Extensions.Logging;
using MyApi.Models.Requests;
using MyApi.Services;
using NSubstitute;

namespace MyApi.Tests.Unit;

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

Create `src/MyApi.Tests/Unit/CreateSampleRequestValidatorTests.cs`:

```csharp
using FluentAssertions;
using MyApi.Models.Requests;
using MyApi.Validators;

namespace MyApi.Tests.Unit;

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
}
```

---

## 15 — Sample Integration Test Fixture

Create `src/MyApi.Tests/Integration/SamplesApiTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using MyApi.Models.Requests;
using MyApi.Models.Responses;

namespace MyApi.Tests.Integration;

public sealed class SamplesApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public SamplesApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PostSample_WhenValid_Returns201()
    {
        // Arrange
        var request = new CreateSampleRequest { Name = "Integration Test" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/samples", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<SampleResponse>();
        body!.Name.Should().Be("Integration Test");
    }

    [Fact]
    public async Task PostSample_WhenNameEmpty_Returns400()
    {
        var request = new CreateSampleRequest { Name = "" };
        var response = await _client.PostAsJsonAsync("/api/samples", request);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
```

---

## 16 — appsettings Files

### `src/MyApi/appsettings.json`

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Cache": {
    "DefaultExpirationMinutes": 5,
    "Enabled": true
  },
  "FeatureManagement": {
    "EnableSampleEndpoint": true
  }
}
```

### `src/MyApi/appsettings.Development.json`

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information"
    }
  }
}
```

> **Never put secrets in appsettings files.** Use Azure Key Vault references or user-secrets for local dev.

---

## 17 — Post-Scaffold Verification

After generating all files, run these commands and confirm they pass:

```bash
dotnet build MyApi.sln
dotnet test MyApi.sln
dotnet run --project src/MyApi
# In another terminal:
curl https://localhost:5001/health
curl https://localhost:5001/openapi/v1.json
```

---

## 18 — Post-Scaffold Checklist

Verify every item before marking the scaffold complete:

- [ ] Solution builds with zero errors and zero warnings.
- [ ] All unit and integration tests pass.
- [ ] `/health` endpoint returns healthy.
- [ ] `/openapi/v1.json` returns a valid OpenAPI spec.
- [ ] Swagger UI loads in the browser in Development mode.
- [ ] Every controller action has full XML doc comments (`<summary>`, `<param>`, `<returns>`, `<response>`).
- [ ] Every DTO class and property has `<summary>` XML docs; key properties have `<example>` tags.
- [ ] Every request DTO has a matching FluentValidation validator.
- [ ] Every service is registered in DI via an extension method.
- [ ] `GenerateDocumentationFile` is enabled in the `.csproj`.
- [ ] No business logic exists in any controller.
- [ ] All async methods accept and forward `CancellationToken`.
- [ ] All classes are `sealed` unless designed for inheritance.
- [ ] Structured logging only — no string interpolation in log calls.
- [ ] Feature flags use `IFeatureManager`, not raw `IConfiguration`.

---

## 19 — Adding a New Resource (Ongoing Instructions)

When the developer asks you to add a new resource (e.g., "add an Orders endpoint"), generate ALL of the following:

1. **Request DTO** in `Models/Requests/` with XML docs and `<example>` tags.
2. **Response DTO** in `Models/Responses/` with XML docs and `<example>` tags.
3. **FluentValidation validator** in `Validators/`.
4. **Service interface** in `Services/`.
5. **Service implementation** in `Services/` (sealed, with `ILogger<T>`).
6. **Controller** in `Controllers/` (sealed, thin, full XML docs, all `[ProducesResponseType]` attributes, `CancellationToken` on every action).
7. **DI registration** — add to or create an extension method in `Extensions/`.
8. **Unit tests** — at least happy path + one failure case for the service, and validation tests for the validator.
9. **Integration test** — at least one `POST` success and one `POST` validation failure.

Never generate a partial stack. Every resource must have the complete vertical slice above.
