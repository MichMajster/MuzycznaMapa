var builder = WebApplication.CreateBuilder(args);

// kontrolery i CORS (React)
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseRouting();
app.UseCors("AllowReact");
app.UseAuthorization();

app.MapControllers();

app.Run();