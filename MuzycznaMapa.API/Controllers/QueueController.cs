using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

namespace MuzycznaMapa.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QueueController : ControllerBase
{
    // ConcurrentDictionary zezwala na jednoczesną prace dla wielu wątków/użytkowników
    private static readonly ConcurrentDictionary<string, List<SongDto>> TileQueues = new();

    // GET: api/queue/53_10
    [HttpGet("{tileId}")]
    public IActionResult GetQueue(string tileId)
    {
        if (!TileQueues.ContainsKey(tileId))
        {
            // zwraca pustą listę, jeśli nic jeszcze nie dodano
            return Ok(new List<SongDto>());
        }

        return Ok(TileQueues[tileId]);
    }

    // POST: api/queue/53_10
    [HttpPost("{tileId}")]
    public IActionResult AddSong(string tileId, [FromBody] SongDto song)
    {
        if (string.IsNullOrWhiteSpace(song.VideoId))
        {
            return BadRequest(new { message = "Brak VideoId" });
        }

        var queue = TileQueues.GetOrAdd(tileId, _ => new List<SongDto>());
        queue.Add(song);

        return Ok(queue);
    }

    // DELETE: api/queue/53_10/...
    [HttpDelete("{tileId}/{videoId}")]
    public IActionResult RemoveSong(string tileId, string videoId)
    {
        if (TileQueues.TryGetValue(tileId, out var queue))
        {
            queue.RemoveAll(s => s.VideoId == videoId);
        }

        return Ok();
    }
}