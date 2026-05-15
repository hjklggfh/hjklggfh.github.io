using System.Collections.Generic;
using UnityEngine;

public class Enemy : MonoBehaviour
{
    [SerializeField] private EnemyData enemyData;
    [SerializeField] private BezierPathFollower follower;
    [SerializeField] private SpriteRenderer spriteRenderer;
    [SerializeField] private GameObject flyingIndicator;

    private float _currentHP;
    private float _currentArmor;
    private bool _isDead;
    private List<ActiveEffect> _activeEffects = new List<ActiveEffect>();

    public EnemyData Data => enemyData;
    public BezierPathFollower Follower => follower;
    public float CurrentHP => _currentHP;
    public float MaxHP => enemyData != null ? enemyData.maxHP : 0f;
    public float Progress01 => follower != null ? follower.Progress01 : 0f;
    public bool IsDead => _isDead;
    public bool HasReachedEnd => follower != null && follower.HasReachedEnd;
    public bool IsFlying => enemyData != null && enemyData.isFlying;
    public bool IsImmuneToSlow => enemyData != null && enemyData.isImmuneToSlow;

    public System.Action<Enemy> OnEnemyDied;
    public System.Action<Enemy> OnEnemyReachedEnd;

    private void Awake()
    {
        if (follower == null) follower = GetComponent<BezierPathFollower>();
        if (spriteRenderer == null) spriteRenderer = GetComponent<SpriteRenderer>();
    }

    public void Initialize(EnemyData data, BezierPath path)
    {
        enemyData = data;
        _currentHP = data.maxHP;
        _currentArmor = data.armor;
        _isDead = false;
        _activeEffects.Clear();

        if (follower != null)
        {
            follower.Path = path;
            follower.enabled = true;
        }

        if (spriteRenderer != null && data.prefab != null)
        {
            var prefabRenderer = data.prefab.GetComponent<SpriteRenderer>();
            if (prefabRenderer != null)
                spriteRenderer.sprite = prefabRenderer.sprite;
        }

        if (flyingIndicator != null)
            flyingIndicator.SetActive(data.isFlying);

        gameObject.SetActive(true);
    }

    public void TakeDamage(float baseDamage, DamageType damageType)
    {
        if (_isDead) return;

        float effectiveDamage = Mathf.Max(1f, baseDamage - _currentArmor);
        _currentHP -= effectiveDamage;

        if (_currentHP <= 0f)
        {
            _currentHP = 0f;
            Die();
        }
    }

    public void ApplySlow(float factor, float duration)
    {
        if (IsImmuneToSlow) return;

        if (follower != null)
            follower.ApplySlow(factor, duration);

        _activeEffects.Add(new ActiveEffect
        {
            type = EffectType.Slow,
            remainingDuration = duration,
            factor = factor
        });
    }

    public void ApplyDamageOverTime(float dps, float duration)
    {
        _activeEffects.Add(new ActiveEffect
        {
            type = EffectType.DoT,
            remainingDuration = duration,
            dps = dps
        });
    }

    private bool _hasReachedEndTriggered;

    private void Update()
    {
        if (_isDead) return;

        if (!_hasReachedEndTriggered && HasReachedEnd)
        {
            _hasReachedEndTriggered = true;
            ReachEnd();
            return;
        }

        float dt = Time.deltaTime;
        for (int i = _activeEffects.Count - 1; i >= 0; i--)
        {
            var effect = _activeEffects[i];
            effect.remainingDuration -= dt;

            if (effect.type == EffectType.DoT)
            {
                TakeDamage(effect.dps * dt, DamageType.Magic);
            }

            if (effect.remainingDuration <= 0f)
                _activeEffects.RemoveAt(i);
        }
    }

    private void Die()
    {
        if (_isDead) return;
        _isDead = true;

        if (follower != null)
            follower.enabled = false;

        int reward = enemyData != null ? enemyData.goldReward : 0;
        OnEnemyDied?.Invoke(this);
        gameObject.SetActive(false);
    }

    public void ReachEnd()
    {
        if (_isDead) return;
        OnEnemyReachedEnd?.Invoke(this);
    }

    public float GetHPPercent() => MaxHP > 0f ? _currentHP / MaxHP : 0f;

    public float GetDistanceToEnd()
    {
        return follower != null ? follower.GetDistanceToEnd() : float.MaxValue;
    }

    private void OnDisable()
    {
        _activeEffects.Clear();
    }

    private enum EffectType { Slow, DoT }

    private class ActiveEffect
    {
        public EffectType type;
        public float remainingDuration;
        public float factor;
        public float dps;
    }
}
