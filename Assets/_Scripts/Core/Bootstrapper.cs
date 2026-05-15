using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Ensures core singleton systems are initialized in the correct order.
/// Attach to the first scene's root GameObject.
/// </summary>
public class Bootstrapper : MonoBehaviour
{
    [Header("Scene References")]
    [SerializeField] private BezierPath enemyPath;
    [SerializeField] private Platform[] platforms;
    [SerializeField] private Transform enemySpawnPoint;
    [SerializeField] private Transform carrotPoint;

    [Header("Data Assets")]
    [SerializeField] private GameEvents gameEvents;
    [SerializeField] private GameStateSO gameState;
    [SerializeField] private List<WaveData> waveDataList;
    [SerializeField] private List<TowerData> availableTowers;

    private void Awake()
    {
        ValidateReferences();
        InitializeSystems();
    }

    private void ValidateReferences()
    {
        if (enemyPath == null)
            Debug.LogWarning("[Bootstrapper] No enemy path assigned. Enemies won't move.");
        if (gameEvents == null)
            Debug.LogError("[Bootstrapper] GameEvents not assigned!");
    }

    private void InitializeSystems()
    {
        // Order matters - singletons auto-create in Awake order
        // GoldManager, Carrot, WaveManager, TowerBuildPanel
        // are accessed via Instance property (lazy init)

        if (gameState != null)
            gameState.CurrentState = GameState.Boot;

        // Wire WaveManager
        var waveMgr = WaveManager.Instance;
        if (waveMgr != null && enemyPath != null)
        {
            var waves = new List<WaveData>(waveDataList);
            waveMgr.LoadWaves(waves, enemyPath);
        }
    }

    [ContextMenu("Auto-Assign From Scene")]
    private void AutoAssignFromScene()
    {
        if (enemyPath == null)
            enemyPath = FindObjectOfType<BezierPath>();
        if (platforms == null || platforms.Length == 0)
            platforms = FindObjectsOfType<Platform>();
    }
}
