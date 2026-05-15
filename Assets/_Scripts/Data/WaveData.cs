using UnityEngine;

[System.Serializable]
public struct WaveEntry
{
    public EnemyData enemyData;
    public int count;
    public float spawnInterval;
    public float preDelay;
}

[CreateAssetMenu(fileName = "WaveData", menuName = "TD/WaveData")]
public class WaveData : ScriptableObject
{
    [Header("Wave Info")]
    public string waveName = "Wave 1";
    public WaveEntry[] entries;
    public float interWaveDelay = 5f;
}
