using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using MuzycznaMapa.API.Data;
using MuzycznaMapa.API.Models;

namespace MuzycznaMapa.API.Controllers;
// using System;

[ApiController]
[Route("api/[controller]")]
public class QueueController : ControllerBase
{
    // siatka kafelków musi być zgodna z frontem (GRID_Z w GridLayer.jsx)
    private const int GridZ = 16;                           // świat dzieli się na 2^16 x 2^16 kwadratów
    private const int ChunkSize = 16;                       // paczka = 16x16 kafelków
    private const int MaxChunk = (1 << GridZ) / ChunkSize;  // 4096 paczek na oś --- 2^16 / 16 = 2^12 = 4096
    // 1 << GridZ -- przesunięcie bitowe w lewo, czyli 2^GridZ = 2^16 = 65536
    private static readonly TimeSpan ChunkCacheTtl = TimeSpan.FromSeconds(20);

    private readonly AppDbContext _context;
    private readonly IMemoryCache _cache;

    public QueueController(AppDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    private static string ChunkKey(int cx, int cy)
    {
        return $"chunk:{cx}:{cy}";
    }

    // po zmianie piosenek na kafelku unieważniamy cache jego paczki
    private void InvalidateChunk(string tileId)
    {
        var parts = tileId.Split('_');
        if (parts.Length == 3
            && int.TryParse(parts[0], out var z) && z == GridZ
            && int.TryParse(parts[1], out var x)
            && int.TryParse(parts[2], out var y))
        {
            _cache.Remove(ChunkKey(x / ChunkSize, y / ChunkSize));
        }
    }

    // GET: api/queue/chunk/2250/1310
    // zwraca { "16_36000_20960": 3, ... } tylko dla kafelków z piosenkami w paczce 16x16
    [HttpGet("chunk/{cx:int}/{cy:int}")]
    public async Task<IActionResult> GetChunkCounts(int cx, int cy)
    {
        if (cx < 0 || cy < 0 || cx >= MaxChunk || cy >= MaxChunk)
        {
            return BadRequest(new { message = "Nieprawidłowa paczka" });
        }

        var counts = await _cache.GetOrCreateAsync(ChunkKey(cx, cy), async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = ChunkCacheTtl;

            var ids = new List<string>(ChunkSize * ChunkSize);
            for (var x = cx * ChunkSize; x < (cx + 1) * ChunkSize; x++)
            {
                for (var y = cy * ChunkSize; y < (cy + 1) * ChunkSize; y++)
                {
                    ids.Add($"{GridZ}_{x}_{y}");
                }
            }

            return await _context.Songs
                .AsNoTracking()
                .Where(s => ids.Contains(s.TileId))
                .GroupBy(s => s.TileId)
                .Select(g => new { TileId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.TileId, g => g.Count);
        });

        return Ok(counts);
    }

    // GET: api/queue/53_10
    [HttpGet("{tileId}")]
    public async Task<IActionResult> GetQueue(string tileId)
    {
        var songs = await _context.Songs
            .AsNoTracking()
            .Where(s => s.TileId == tileId)
            .OrderBy(s => s.CreatedAt)
            .Select(s => new
            {
                videoId = s.VideoId,
                title = s.Title
            })
            .ToListAsync();

        return Ok(songs);
    }

    // POST: api/queue/53_10
    [HttpPost("{tileId}")]
    public async Task<IActionResult> AddSong(string tileId, [FromBody] SongDto songDto)
    {
        if (string.IsNullOrWhiteSpace(songDto.VideoId))
        {
            return BadRequest(new { message = "Brak VideoId" });
        }

        var newSong = new Song
        {
            TileId = tileId,
            VideoId = songDto.VideoId,
            Title = songDto.Title,
            CreatedAt = DateTime.UtcNow
        };

        _context.Songs.Add(newSong);
        await _context.SaveChangesAsync();
        InvalidateChunk(tileId);

        return await GetQueue(tileId);
    }

    // DELETE: api/queue/53_10/...
    [HttpDelete("{tileId}/{videoId}")]
    public async Task<IActionResult> RemoveSong(string tileId, string videoId)
    {
        var songsToRemove = await _context.Songs
            .Where(s => s.TileId == tileId && s.VideoId == videoId)
            .ToListAsync();

        if (songsToRemove.Any())
        {
            _context.Songs.RemoveRange(songsToRemove);
            await _context.SaveChangesAsync();
            InvalidateChunk(tileId);
        }

        return Ok();
    }
}