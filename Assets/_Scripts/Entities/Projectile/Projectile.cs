using UnityEngine;

public class Projectile : MonoBehaviour
{
    [SerializeField] private SpriteRenderer spriteRenderer;
    [SerializeField] private TrailRenderer trailRenderer;
    [SerializeField] private float lifetime = 5f;

    private float _damage;
    private Enemy _target;
    private DamageType _damageType;
    private bool _hasSplash;
    private float _splashRadius;
    private bool _isPenetrating;
    private bool _appliesSlow;
    private float _slowFactor;
    private float _slowDuration;
    private float _speed;
    private float _timer;

    private Vector2 _moveDirection;
    private bool _useDirection;

    public System.Action<Projectile> OnProjectileDone;

    public void Initialize(float damage, Enemy target, DamageType damageType,
        bool hasSplash, float splashRadius, bool isPenetrating,
        bool appliesSlow, float slowFactor, float slowDuration, float speed)
    {
        _damage = damage;
        _target = target;
        _damageType = damageType;
        _hasSplash = hasSplash;
        _splashRadius = splashRadius;
        _isPenetrating = isPenetrating;
        _appliesSlow = appliesSlow;
        _slowFactor = slowFactor;
        _slowDuration = slowDuration;
        _speed = speed;
        _timer = 0f;
        _useDirection = false;

        if (trailRenderer != null)
            trailRenderer.Clear();
    }

    public void SetDirection(Vector2 direction)
    {
        _useDirection = true;
        _moveDirection = direction;
    }

    private void Update()
    {
        _timer += Time.deltaTime;
        if (_timer >= lifetime)
        {
            ReturnToPool();
            return;
        }

        Move();
        CheckHit();
    }

    private void Move()
    {
        Vector2 targetPos;
        if (_useDirection)
        {
            targetPos = (Vector2)transform.position + _moveDirection * _speed * Time.deltaTime;
        }
        else if (_target != null)
        {
            targetPos = Vector2.MoveTowards(transform.position, _target.transform.position,
                _speed * Time.deltaTime);
        }
        else
        {
            ReturnToPool();
            return;
        }

        // Rotate toward movement
        Vector2 moveDir = targetPos - (Vector2)transform.position;
        if (moveDir.sqrMagnitude > 0.001f)
        {
            float angle = Mathf.Atan2(moveDir.y, moveDir.x) * Mathf.Rad2Deg;
            transform.rotation = Quaternion.Euler(0, 0, angle);
        }

        transform.position = targetPos;
    }

    private void CheckHit()
    {
        if (_target == null || _target.IsDead || !_target.gameObject.activeSelf)
        {
            if (!_useDirection)
            {
                ReturnToPool();
            }
            return;
        }

        float hitDist = _hasSplash ? _splashRadius * 0.5f : 0.3f;
        float dist = Vector2.Distance(transform.position, _target.transform.position);

        if (dist <= hitDist)
        {
            ApplyDamage();
        }
    }

    private void ApplyDamage()
    {
        if (_hasSplash)
        {
            // Area damage
            var hits = Physics2D.OverlapCircleAll(transform.position, _splashRadius);
            foreach (var hit in hits)
            {
                var enemy = hit.GetComponent<Enemy>();
                if (enemy != null && !enemy.IsDead)
                {
                    HitEnemy(enemy);
                }
            }
        }
        else
        {
            if (_target != null)
                HitEnemy(_target);
        }

        if (!_isPenetrating)
            ReturnToPool();
    }

    private void HitEnemy(Enemy enemy)
    {
        enemy.TakeDamage(_damage, _damageType);

        if (_appliesSlow)
            enemy.ApplySlow(_slowFactor, _slowDuration);
    }

    private void OnTriggerEnter2D(Collider2D other)
    {
        // For penetrating projectiles passing through enemies
        if (!_isPenetrating) return;

        var enemy = other.GetComponent<Enemy>();
        if (enemy != null && !enemy.IsDead)
        {
            HitEnemy(enemy);
        }
    }

    private void ReturnToPool()
    {
        OnProjectileDone?.Invoke(this);
        ProjectilePool.Instance?.ReturnProjectile(this);
    }
}
