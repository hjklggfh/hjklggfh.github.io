using UnityEngine;

public class TowerAttack : MonoBehaviour
{
    [SerializeField] private Transform firePoint;
    [SerializeField] private Transform turretPivot;
    [SerializeField] private float rotationSpeed = 360f;

    private Tower _tower;
    private TowerTargeting _targeting;
    private float _cooldownTimer;

    private void Awake()
    {
        _targeting = GetComponent<TowerTargeting>();
        if (firePoint == null) firePoint = transform;
    }

    public void Initialize(Tower tower)
    {
        _tower = tower;
        _cooldownTimer = 0f;
    }

    private void Update()
    {
        if (_tower == null || _targeting == null) return;

        _cooldownTimer -= Time.deltaTime;

        var target = _targeting.CurrentTarget;
        if (target != null)
        {
            RotateToward(target.transform.position);

            if (_cooldownTimer <= 0f)
                Fire(target);
        }
    }

    private void RotateToward(Vector3 targetPosition)
    {
        if (turretPivot == null) return;

        Vector2 dir = (targetPosition - turretPivot.position).normalized;
        float targetAngle = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg;
        float currentAngle = turretPivot.eulerAngles.z;
        float angle = Mathf.MoveTowardsAngle(currentAngle, targetAngle, rotationSpeed * Time.deltaTime);
        turretPivot.rotation = Quaternion.Euler(0, 0, angle);
    }

    private void Fire(Enemy target)
    {
        if (_tower == null || ProjectilePool.Instance == null) return;

        var stats = _tower.CurrentStats;
        var data = _tower.Data;

        Vector2 spawnPos = firePoint != null ? firePoint.position : transform.position;
        Vector2 direction = ((Vector2)target.transform.position - spawnPos).normalized;

        var projectile = ProjectilePool.Instance.GetProjectile(
            data.towerType,
            target,
            spawnPos,
            direction
        );

        if (projectile != null)
        {
            projectile.Initialize(
                stats.damage,
                target,
                data.damageType,
                data.hasSplash,
                data.splashRadius,
                data.isPenetrating,
                data.appliesSlow,
                data.slowFactor,
                data.slowDuration,
                data.projectileSpeed
            );
        }

        _cooldownTimer = 1f / stats.fireRate;
    }
}
