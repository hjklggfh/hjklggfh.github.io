using UnityEngine;

namespace TD
{
    public enum EnemyType { Normal, Fast, Heavy, Boss }
    public enum DamageType { Physical, Magic, Fire, Ice }
    public enum TargetingStrategy { ClosestToEnd, First, Last, Weakest, Strongest }
    public enum GameState { Boot, PreWave, WaveActive, PostWave, Paused, GameOver, Victory }
    public enum TowerType { BottleCannon, IceStar, SunFlower, Rocket }
}
