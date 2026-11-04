namespace MuzycznaMapa.API.Models;

public class Song{
    public int Id { get; set; }
    public string TileId { get; set; } = string.Empty; // np. "53_10"
    public string VideoId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}