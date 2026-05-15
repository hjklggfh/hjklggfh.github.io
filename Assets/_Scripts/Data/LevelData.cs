using System.Collections.Generic;
using UnityEngine;

[CreateAssetMenu(fileName = "LevelData", menuName = "TD/LevelData")]
public class LevelData : ScriptableObject
{
    [Header("Level Info")]
    public string levelName = "Level 1";
    public int levelIndex = 1;

    [Header("Map")]
    public GameObject levelPrefab;
    public List<Vector2> pathControlPoints;
    public List<Vector2> platformPositions;

    [Header("Waves")]
    public List<WaveData> waves;

    [Header("Available Towers")]
    public List<TowerData> allowedTowers;

    [Header("Balance Overrides")]
    public int startingGold = 200;
    public int carrotMaxHP = 10;
}
