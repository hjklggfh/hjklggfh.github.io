using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class TowerBuildButton : MonoBehaviour
{
    [SerializeField] private Image iconImage;
    [SerializeField] private TextMeshProUGUI nameText;
    [SerializeField] private TextMeshProUGUI costText;
    [SerializeField] private Button button;

    public TowerData TowerData { get; private set; }
    private System.Action<TowerData> _onClick;

    public void Setup(TowerData data, System.Action<TowerData> onClick)
    {
        TowerData = data;
        _onClick = onClick;

        if (iconImage != null && data.icon != null)
            iconImage.sprite = data.icon;

        if (nameText != null)
            nameText.text = data.towerName;

        int cost = data.GetLevelStats(1).upgradeCost;
        if (costText != null)
            costText.text = cost.ToString();

        if (button != null)
            button.onClick.AddListener(() => _onClick?.Invoke(data));
    }

    public void SetInteractable(bool interactable)
    {
        if (button != null)
            button.interactable = interactable;

        if (costText != null)
            costText.color = interactable ? Color.white : Color.red;
    }
}
