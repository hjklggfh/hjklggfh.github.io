using UnityEngine;

public class BezierPathFollower : MonoBehaviour
{
    [SerializeField] private BezierPath path;
    [SerializeField] private float baseSpeed = 2f;

    private float _progress01;
    private float _currentSpeed;
    private bool _isMoving = true;
    private float _slowTimer;
    private float _slowFactor = 1f;

    public float Progress01 => _progress01;
    public float CurrentSpeed => _currentSpeed;
    public bool HasReachedEnd => _progress01 >= 1f;
    public BezierPath Path
    {
        get => path;
        set => path = value;
    }

    private void OnEnable()
    {
        _progress01 = 0f;
        _currentSpeed = baseSpeed;
        _isMoving = true;
        _slowTimer = 0f;
        _slowFactor = 1f;
    }

    private void Update()
    {
        if (!_isMoving || path == null) return;

        if (_slowTimer > 0f)
        {
            _slowTimer -= Time.deltaTime;
            if (_slowTimer <= 0f)
                _slowFactor = 1f;
        }

        _currentSpeed = baseSpeed * _slowFactor;
        float distToTravel = _currentSpeed * Time.deltaTime;

        if (path.TotalLength > 0.001f)
            _progress01 += distToTravel / path.TotalLength;

        _progress01 = Mathf.Clamp01(_progress01);

        Vector2 worldPos = path.GetPositionAtProgress(_progress01);
        Vector2 pathPos = (Vector2)path.transform.position + worldPos;
        transform.position = pathPos;

        // Rotate toward movement direction
        Vector2 dir = path.GetDirectionAtProgress(_progress01);
        if (dir.sqrMagnitude > 0.001f)
        {
            float angle = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg;
            transform.rotation = Quaternion.Euler(0, 0, angle);
        }
    }

    public void ApplySlow(float factor, float duration)
    {
        _slowFactor = Mathf.Min(_slowFactor, factor);
        _slowTimer = Mathf.Max(_slowTimer, duration);
    }

    public void Pause() => _isMoving = false;
    public void Resume() => _isMoving = true;

    public void SetSpeedMultiplier(float multiplier)
    {
        baseSpeed *= multiplier;
    }

    public float GetDistanceToEnd()
    {
        return path != null ? path.GetRemainingDistance(_progress01) : float.MaxValue;
    }
}
