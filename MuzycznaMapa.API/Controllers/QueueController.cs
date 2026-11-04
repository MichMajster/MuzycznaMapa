using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MuzycznaMapa.API.Data;
using MuzycznaMapa.API.Models;

namespace MuzycznaMapa.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QueueController : ControllerBase
{
    private readonly AppDbContext _context;

    public QueueController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/queue/53_10
    [HttpGet("{tileId}")]
    public async Task<IActionResult> GetQueue(string tileId)
    {
        var songs = await _context.Songs
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
        }

        return Ok();
    }
}