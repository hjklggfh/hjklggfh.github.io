using System;
using UnityEngine;
using UnityEngine.Events;

[CreateAssetMenu(fileName = "GameEvents", menuName = "TD/GameEvents")]
public class GameEvents : ScriptableObject
{
    public UnityEvent<int> OnGoldChanged;
    public UnityEvent<int, int> OnCarrotHPChanged;
    public UnityEvent<int, int> OnWaveStarted;
    public UnityEvent<int> OnWaveEnded;
    public UnityEvent<Enemy> OnEnemySpawned;
    public UnityEvent<Enemy, int> OnEnemyDied;
    public UnityEvent<Enemy, int> OnEnemyLeaked;
    public UnityEvent<Tower> OnTowerPlaced;
    public UnityEvent<Tower, int> OnTowerSold;
    public UnityEvent OnGameWon;
    public UnityEvent OnGameLost;

    private void OnEnable()
    {
        OnGoldChanged ??= new UnityEvent<int>();
        OnCarrotHPChanged ??= new UnityEvent<int, int>();
        OnWaveStarted ??= new UnityEvent<int, int>();
        OnWaveEnded ??= new UnityEvent<int>();
        OnEnemySpawned ??= new UnityEvent<Enemy>();
        OnEnemyDied ??= new UnityEvent<Enemy, int>();
        OnEnemyLeaked ??= new UnityEvent<Enemy, int>();
        OnTowerPlaced ??= new UnityEvent<Tower>();
        OnTowerSold ??= new UnityEvent<Tower, int>();
        OnGameWon ??= new UnityEvent();
        OnGameLost ??= new UnityEvent();
    }
}
