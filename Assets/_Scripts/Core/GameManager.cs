using System.Collections.Generic;
using UnityEngine;

public class GameManager : Singleton<GameManager>
{
    [Header("References")]
    [SerializeField] private GameEvents gameEvents;
    [SerializeField] private GameStateSO gameState;
    [SerializeField] private BezierPath[] levelPaths;
    [SerializeField] private Platform[] platforms;

    [Header("Wave Config")]
    [SerializeField] private List<WaveData> waveDatas = new List<WaveData>();

    [Header("Tower Config")]
    [SerializeField] private List<TowerData> availableTowers;

    public List<WaveData> WaveDatas => waveDatas;
    public List<TowerData> AvailableTowers => availableTowers;

    protected override void Awake()
    {
        base.Awake();
        if (gameState != null)
            gameState.CurrentState = GameState.Boot;
    }

    private void OnEnable()
    {
        if (gameEvents != null)
        {
            gameEvents.OnGameWon.AddListener(OnGameWon);
            gameEvents.OnGameLost.AddListener(OnGameLost);
        }
    }

    private void OnDisable()
    {
        if (gameEvents != null)
        {
            gameEvents.OnGameWon.RemoveListener(OnGameWon);
            gameEvents.OnGameLost.RemoveListener(OnGameLost);
        }
    }

    private void Start()
    {
        if (gameState != null)
            gameState.CurrentState = GameState.PreWave;

        // Wire WaveManager with level data
        var waveMgr = WaveManager.Instance;
        if (waveMgr != null && levelPaths.Length > 0)
        {
            waveMgr.LoadWaves(waveDatas, levelPaths[0]);
        }

        // Wire TowerBuildPanel with available towers
        var buildPanel = TowerBuildPanel.Instance;
        if (buildPanel != null && availableTowers.Count > 0)
        {
            // Towers are configured via the BuildPanel's inspector
        }
    }

    public void StartGame()
    {
        if (gameState != null)
            gameState.CurrentState = GameState.WaveActive;

        WaveManager.Instance?.StartFirstWave();
    }

    public void PauseGame()
    {
        if (gameState != null && (gameState.CurrentState == GameState.WaveActive
            || gameState.CurrentState == GameState.PostWave))
        {
            gameState.CurrentState = GameState.Paused;
            Time.timeScale = 0f;
        }
    }

    public void ResumeGame()
    {
        if (gameState != null && gameState.CurrentState == GameState.Paused)
        {
            Time.timeScale = 1f;
            gameState.CurrentState = WaveManager.Instance != null
                && WaveManager.Instance.EnemiesAliveInWave > 0
                ? GameState.WaveActive : GameState.PostWave;
        }
    }

    private void OnGameWon()
    {
        if (gameState != null)
            gameState.CurrentState = GameState.Victory;
    }

    private void OnGameLost()
    {
        if (gameState != null)
            gameState.CurrentState = GameState.GameOver;
    }

    #region Public Helpers

    public Platform GetNearestPlatform(Vector2 point, float maxDist = 2f)
    {
        Platform best = null;
        float bestDist = maxDist;

        foreach (var p in platforms)
        {
            if (p == null || p.IsOccupied) continue;
            float dist = Vector2.Distance(point, p.transform.position);
            if (dist < bestDist)
            {
                bestDist = dist;
                best = p;
            }
        }
        return best;
    }

    public BezierPath GetMainPath()
    {
        return levelPaths != null && levelPaths.Length > 0 ? levelPaths[0] : null;
    }

    #endregion
}
