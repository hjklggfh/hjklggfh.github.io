using System.Collections.Generic;
using UnityEngine;

public class TowerBuildPanel : Singleton<TowerBuildPanel>
{
    [SerializeField] private GameEvents gameEvents;
    [SerializeField] private GameObject buildPanelRoot;
    [SerializeField] private Transform buildButtonsContainer;
    [SerializeField] private GameObject buildButtonPrefab;
    [SerializeField] private GameObject selectedTowerPanel;
    [SerializeField] private TowerInfoPanel towerInfoPanel;

    [Header("Available Towers")]
    [SerializeField] private List<TowerData> availableTowers;

    private Platform _selectedPlatform;
    private Tower _selectedTower;
    private List<TowerBuildButton> _buildButtons = new List<TowerBuildButton>();

    protected override void Awake()
    {
        base.Awake();
        if (buildPanelRoot != null)
            buildPanelRoot.SetActive(false);
        if (selectedTowerPanel != null)
            selectedTowerPanel.SetActive(false);
    }

    private void Start()
    {
        foreach (var data in availableTowers)
        {
            if (data == null) continue;
            var go = Instantiate(buildButtonPrefab, buildButtonsContainer);
            var button = go.GetComponent<TowerBuildButton>();
            if (button != null)
            {
                button.Setup(data, OnBuildTower);
                _buildButtons.Add(button);
            }
        }

        if (towerInfoPanel != null)
        {
            towerInfoPanel.OnUpgradeClicked += HandleUpgrade;
            towerInfoPanel.OnSellClicked += HandleSell;
            towerInfoPanel.OnCloseClicked += DeselectTower;
        }
    }

    public void ShowBuildMenu(Platform platform)
    {
        _selectedPlatform = platform;
        _selectedTower = null;

        if (buildPanelRoot != null)
        {
            buildPanelRoot.SetActive(true);
            PositionPanel(platform.transform.position);
        }

        if (selectedTowerPanel != null)
            selectedTowerPanel.SetActive(false);

        UpdateButtonStates();
    }

    public void ShowTowerInfo(Tower tower)
    {
        _selectedTower = tower;
        _selectedPlatform = tower.Platform;

        if (buildPanelRoot != null)
        {
            buildPanelRoot.SetActive(true);
            PositionPanel(tower.transform.position);
        }

        if (selectedTowerPanel != null)
            selectedTowerPanel.SetActive(true);

        if (towerInfoPanel != null)
            towerInfoPanel.Show(tower);
    }

    public void DeselectTower()
    {
        _selectedTower?.ShowRangeIndicator(false);
        _selectedTower?.SetHighlight(false);
        _selectedTower = null;
        _selectedPlatform?.SetHighlight(false);
        _selectedPlatform = null;

        if (buildPanelRoot != null)
            buildPanelRoot.SetActive(false);
        if (selectedTowerPanel != null)
            selectedTowerPanel.SetActive(false);
    }

    private void OnBuildTower(TowerData data)
    {
        if (_selectedPlatform == null || _selectedPlatform.IsOccupied) return;

        int cost = data.GetLevelStats(1).upgradeCost;
        if (GoldManager.Instance == null || !GoldManager.Instance.CanAfford(cost)) return;

        if (!GoldManager.Instance.Spend(cost)) return;

        var prefab = data.prefab != null ? data.prefab : new GameObject(data.towerName);
        var go = Instantiate(prefab, _selectedPlatform.transform);
        go.transform.localPosition = Vector3.zero;

        var tower = go.GetComponent<Tower>();
        if (tower == null) tower = go.AddComponent<Tower>();

        tower.Initialize(data, 1, _selectedPlatform);
        _selectedPlatform.PlaceTower(tower);

        gameEvents?.OnTowerPlaced?.Invoke(tower);
        DeselectTower();
    }

    private void HandleUpgrade(Tower tower)
    {
        if (tower == null || !tower.CanUpgrade()) return;
        tower.Upgrade();
        if (towerInfoPanel != null)
            towerInfoPanel.Show(tower);
    }

    private void HandleSell(Tower tower)
    {
        if (tower == null) return;
        int value = tower.GetSellValue();
        tower.Sell();
        gameEvents?.OnTowerSold?.Invoke(tower, value);
        DeselectTower();
    }

    private void PositionPanel(Vector3 worldPos)
    {
        if (buildPanelRoot == null) return;

        var canvas = buildPanelRoot.GetComponentInParent<Canvas>();
        if (canvas == null) return;

        Vector2 screenPos;
        if (canvas.renderMode == RenderMode.ScreenSpaceOverlay)
        {
            screenPos = Camera.main != null
                ? Camera.main.WorldToScreenPoint(worldPos)
                : Vector2.zero;
        }
        else
        {
            screenPos = worldPos;
        }

        screenPos += new Vector2(100, 0);
        buildPanelRoot.transform.position = screenPos;
    }

    private void UpdateButtonStates()
    {
        foreach (var button in _buildButtons)
        {
            if (button == null) continue;
            bool canAfford = GoldManager.Instance != null
                && GoldManager.Instance.CanAfford(button.TowerData.GetLevelStats(1).upgradeCost);
            button.SetInteractable(canAfford);
        }
    }

    private void Update()
    {
        // Update button affordability each frame
        UpdateButtonStates();
    }
}
