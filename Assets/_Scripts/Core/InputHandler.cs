using UnityEngine;

public class InputHandler : Singleton<InputHandler>
{
    [SerializeField] private GameEvents gameEvents;
    [SerializeField] private LayerMask platformLayer;
    [SerializeField] private LayerMask towerLayer;
    [SerializeField] private GameStateSO gameState;

    private Camera _mainCamera;

    protected override void Awake()
    {
        base.Awake();
        _mainCamera = Camera.main;
    }

    private void Update()
    {
        if (gameState != null && gameState.CurrentState != GameState.WaveActive
            && gameState.CurrentState != GameState.PreWave
            && gameState.CurrentState != GameState.PostWave)
            return;

        if (Input.GetMouseButtonDown(0))
        {
            HandleClick();
        }
    }

    private void HandleClick()
    {
        Vector2 worldPoint = _mainCamera != null
            ? _mainCamera.ScreenToWorldPoint(Input.mousePosition)
            : Vector2.zero;

        // Check for tower click first
        var towerHit = Physics2D.Raycast(worldPoint, Vector2.zero, 0f, towerLayer);
        if (towerHit.collider != null)
        {
            var tower = towerHit.collider.GetComponent<Tower>();
            if (tower != null)
            {
                OnTowerClicked(tower);
                return;
            }
        }

        // Check for platform click
        var platformHit = Physics2D.Raycast(worldPoint, Vector2.zero, 0f, platformLayer);
        if (platformHit.collider != null)
        {
            var platform = platformHit.collider.GetComponent<Platform>();
            if (platform != null)
            {
                OnPlatformClicked(platform);
                return;
            }
        }

        // Clicked empty space
        TowerBuildPanel.Instance?.DeselectTower();
    }

    private void OnTowerClicked(Tower tower)
    {
        // Deselect previous
        TowerBuildPanel.Instance?.DeselectTower();

        tower.ShowRangeIndicator(true);
        tower.SetHighlight(true);

        TowerBuildPanel.Instance?.ShowTowerInfo(tower);
    }

    private void OnPlatformClicked(Platform platform)
    {
        TowerBuildPanel.Instance?.DeselectTower();

        if (!platform.IsOccupied)
        {
            platform.SetHighlight(true);
            TowerBuildPanel.Instance?.ShowBuildMenu(platform);
        }
    }
}
