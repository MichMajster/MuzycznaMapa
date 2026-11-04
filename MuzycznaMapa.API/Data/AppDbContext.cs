using Microsoft.EntityFrameworkCore;
using MuzycznaMapa.API.Models;

namespace MuzycznaMapa.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Song> Songs => Set<Song>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Indeks na TileId błyskawicznie przyspiesza wyszukiwanie po kafelku
        modelBuilder.Entity<Song>()
            .HasIndex(s => s.TileId);
    }
}