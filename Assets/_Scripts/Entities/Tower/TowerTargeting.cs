using System.Collections.Generic;
using UnityEngine;

public class TowerTargeting : MonoBehaviour
{
    [SerializeField] private TargetingStrategy strategy = TargetingStrategy.ClosestToEnd;
    [SerializeField] private CircleCollider2D detectionZone;
    [SerializeField] private float targetingInterval = 0.15f;

    private Tower _tower;
    private List<Enemy> _enemiesInRange = new List<Enemy>();
    private Enemy _currentTarget;
    private float _nextTargetingTime;

    public Enemy CurrentTarget => _currentTarget;
    public TargetingStrategy Strategy
    {
        get => strategy;
        set => strategy = value;
    }

    private void Awake()
    {
        if (detectionZone == null)
            detectionZone = GetComponent<CircleCollider2D>();
    }

    public void Initialize(Tower tower)
    {
        _tower = tower;
        RefreshRange(tower);
    }

    public void RefreshRange(Tower tower)
    {
        if (detectionZone != null)
            detectionZone.radius = tower.CurrentStats.range;
    }

    private void Update()
    {
        if (Time.time < _nextTargetingTime) return;
        _nextTargetingTime = Time.time + targetingInterval;

        UpdateTarget();
    }

    private void UpdateTarget()
    {
        // Clean dead/null entries
        _enemiesInRange.RemoveAll(e => e == null || e.IsDead || !e.gameObject.activeSelf);

        if (_enemiesInRange.Count == 0)
        {
            _currentTarget = null;
            return;
        }

        // If current target is still valid, keep it (target lock)
        if (_currentTarget != null && !_currentTarget.IsDead
            && _currentTarget.gameObject.activeSelf
            && IsInRange(_currentTarget))
        {
            return;
        }

        _currentTarget = null;

        // Sort and pick best target
        switch (strategy)
        {
            case TargetingStrategy.ClosestToEnd:
            case TargetingStrategy.First:
                // Highest progress = closest to end
                _enemiesInRange.Sort((a, b) => b.Progress01.CompareTo(a.Progress01));
                _currentTarget = _enemiesInRange[0];
                break;

            case TargetingStrategy.Last:
                _enemiesInRange.Sort((a, b) => a.Progress01.CompareTo(b.Progress01));
                _currentTarget = _enemiesInRange[0];
                break;

            case TargetingStrategy.Weakest:
                _enemiesInRange.Sort((a, b) => a.CurrentHP.CompareTo(b.CurrentHP));
                _currentTarget = _enemiesInRange[0];
                break;

            case TargetingStrategy.Strongest:
                _enemiesInRange.Sort((a, b) => b.CurrentHP.CompareTo(a.CurrentHP));
                _currentTarget = _enemiesInRange[0];
                break;
        }
    }

    private bool IsInRange(Enemy enemy)
    {
        if (enemy == null) return false;
        float dist = Vector2.Distance(transform.position, enemy.transform.position);
        float range = _tower != null ? _tower.CurrentStats.range : detectionZone.radius;
        return dist <= range;
    }

    private void OnTriggerEnter2D(Collider2D other)
    {
        var enemy = other.GetComponent<Enemy>();
        if (enemy != null && !_enemiesInRange.Contains(enemy))
        {
            _enemiesInRange.Add(enemy);
        }
    }

    private void OnTriggerExit2D(Collider2D other)
    {
        var enemy = other.GetComponent<Enemy>();
        if (enemy != null)
        {
            _enemiesInRange.Remove(enemy);
            if (_currentTarget == enemy)
                _currentTarget = null;
        }
    }
}
