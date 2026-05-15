using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class WaveManager : Singleton<WaveManager>
{
    [SerializeField] private List<WaveData> waves = new List<WaveData>();
    [SerializeField] private GameEvents gameEvents;
    [SerializeField] private EnemyFactory enemyFactory;
    [SerializeField] private BezierPath spawnPath;

    private int _currentWaveIndex = -1;
    private int _enemiesAliveInWave;
    private bool _isSpawning;
    private Coroutine _waveRoutine;
    private List<Enemy> _activeEnemies = new List<Enemy>();

    public int CurrentWaveIndex => _currentWaveIndex;
    public int TotalWaves => waves.Count;
    public bool IsSpawning => _isSpawning;
    public int EnemiesAliveInWave => _enemiesAliveInWave;

    private void Start()
    {
        if (enemyFactory == null)
            enemyFactory = FindObjectOfType<EnemyFactory>();
    }

    public void LoadWaves(List<WaveData> waveList, BezierPath path)
    {
        waves = waveList;
        spawnPath = path;
        _currentWaveIndex = -1;
    }

    public void StartFirstWave()
    {
        StartNextWave();
    }

    public void StartNextWave()
    {
        if (_waveRoutine != null)
            StopCoroutine(_waveRoutine);

        _currentWaveIndex++;

        if (_currentWaveIndex >= waves.Count)
        {
            TriggerVictory();
            return;
        }

        _waveRoutine = StartCoroutine(RunWave(waves[_currentWaveIndex]));
    }

    private IEnumerator RunWave(WaveData wave)
    {
        gameEvents?.OnWaveStarted?.Invoke(_currentWaveIndex + 1, waves.Count);

        yield return new WaitForSeconds(1f);

        _isSpawning = true;
        _enemiesAliveInWave = 0;

        foreach (var entry in wave.entries)
        {
            if (entry.enemyData == null) continue;

            yield return new WaitForSeconds(entry.preDelay);

            for (int i = 0; i < entry.count; i++)
            {
                SpawnEnemy(entry.enemyData);
                yield return new WaitForSeconds(entry.spawnInterval);
            }
        }

        _isSpawning = false;

        // Wait for all enemies in this wave to be cleared
        while (_enemiesAliveInWave > 0)
            yield return null;

        gameEvents?.OnWaveEnded?.Invoke(_currentWaveIndex + 1);

        yield return new WaitForSeconds(wave.interWaveDelay);

        // Auto-advance or wait for player
        var settings = GameBalanceSettings.Instance;
        if (settings != null && settings.autoAdvanceWaves)
        {
            StartNextWave();
        }
    }

    private void SpawnEnemy(EnemyData data)
    {
        if (enemyFactory == null || spawnPath == null)
        {
            Debug.LogError("[WaveManager] Missing enemyFactory or spawnPath");
            return;
        }

        var enemy = enemyFactory.SpawnEnemy(data, spawnPath);
        if (enemy == null) return;

        enemy.OnEnemyDied += HandleEnemyDied;
        enemy.OnEnemyReachedEnd += HandleEnemyReachedEnd;
        _enemiesAliveInWave++;

        gameEvents?.OnEnemySpawned?.Invoke(enemy);
    }

    private void HandleEnemyDied(Enemy enemy)
    {
        enemy.OnEnemyDied -= HandleEnemyDied;
        enemy.OnEnemyReachedEnd -= HandleEnemyReachedEnd;

        int reward = enemy.Data != null ? enemy.Data.goldReward : 0;
        GoldManager.Instance?.Earn(reward);
        gameEvents?.OnEnemyDied?.Invoke(enemy, reward);

        _enemiesAliveInWave--;
        enemyFactory?.ReturnEnemy(enemy);
    }

    private void HandleEnemyReachedEnd(Enemy enemy)
    {
        enemy.OnEnemyDied -= HandleEnemyDied;
        enemy.OnEnemyReachedEnd -= HandleEnemyReachedEnd;

        int leakCost = enemy.Data != null ? enemy.Data.hpLeakCost : 1;
        gameEvents?.OnEnemyLeaked?.Invoke(enemy, leakCost);

        _enemiesAliveInWave--;
        enemyFactory?.ReturnEnemy(enemy);
    }

    private void TriggerVictory()
    {
        gameEvents?.OnGameWon?.Invoke();
    }

    public bool HasMoreWaves()
    {
        return _currentWaveIndex < waves.Count - 1;
    }

    public void ClearAllEnemies()
    {
        foreach (var enemy in FindObjectsOfType<Enemy>())
        {
            if (enemy != null && enemy.gameObject.activeSelf)
            {
                enemy.gameObject.SetActive(false);
            }
        }
        _enemiesAliveInWave = 0;
    }
}
