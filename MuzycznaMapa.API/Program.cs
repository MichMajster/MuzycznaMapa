using Microsoft.EntityFrameworkCore;
using MuzycznaMapa.API.Data; // AppDbContext

var builder = WebApplication.CreateBuilder(args);

// rejestracja PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

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


//docker run --name muzyczna-baza -e POSTGRES_PASSWORD=twoje_haslo -p 5433:5432 -v pgdata-mm:/var/lib/postgresql -d postgres

//dotnet ef database update