using UnityEngine;
using UnityEngine.Events;

public class Platform : MonoBehaviour
{
    [SerializeField] private SpriteRenderer platformRenderer;
    [SerializeField] private Color emptyColor = new Color(0.3f, 0.5f, 0.3f, 0.6f);
    [SerializeField] private Color occupiedColor = new Color(0.5f, 0.3f, 0.3f, 0.6f);
    [SerializeField] private Color highlightColor = new Color(0.5f, 0.8f, 0.5f, 0.8f);

    public Tower OccupiedTower { get; private set; }
    public bool IsOccupied => OccupiedTower != null;

    public UnityEvent<Platform> OnPlatformClicked;

    private bool _isHighlighted;

    private void Awake()
    {
        if (platformRenderer == null)
            platformRenderer = GetComponent<SpriteRenderer>();
        UpdateVisual();
    }

    private void OnMouseDown()
    {
        OnPlatformClicked?.Invoke(this);
    }

    public bool PlaceTower(Tower tower)
    {
        if (IsOccupied) return false;

        OccupiedTower = tower;
        tower.transform.SetParent(transform);
        tower.transform.localPosition = Vector3.zero;
        UpdateVisual();
        return true;
    }

    public void RemoveTower()
    {
        OccupiedTower = null;
        UpdateVisual();
    }

    public void SetHighlight(bool highlight)
    {
        _isHighlighted = highlight;
        UpdateVisual();
    }

    private void UpdateVisual()
    {
        if (platformRenderer == null) return;

        if (_isHighlighted)
            platformRenderer.color = highlightColor;
        else if (IsOccupied)
            platformRenderer.color = occupiedColor;
        else
            platformRenderer.color = emptyColor;
    }

    #if UNITY_EDITOR
    private void OnDrawGizmos()
    {
        if (!IsOccupied)
        {
            Gizmos.color = new Color(0f, 1f, 0f, 0.3f);
            Gizmos.DrawCube(transform.position, Vector3.one * 0.8f);
        }
    }
    #endif
}
