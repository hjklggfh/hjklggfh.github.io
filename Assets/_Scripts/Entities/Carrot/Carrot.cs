using UnityEngine;

public class Carrot : Singleton<Carrot>
{
    [SerializeField] private GameEvents gameEvents;
    [SerializeField] private int maxHP = 10;

    private int _currentHP;

    public int CurrentHP => _currentHP;
    public int MaxHP => maxHP;

    protected override void Awake()
    {
        base.Awake();
        var settings = GameBalanceSettings.Instance;
        if (settings != null) maxHP = settings.carrotMaxHP;
        _currentHP = maxHP;
    }

    private void Start()
    {
        gameEvents?.OnCarrotHPChanged?.Invoke(_currentHP, maxHP);
    }

    private void OnEnable()
    {
        if (gameEvents != null)
            gameEvents.OnEnemyLeaked.AddListener(OnEnemyLeaked);
    }

    private void OnDisable()
    {
        if (gameEvents != null)
            gameEvents.OnEnemyLeaked.RemoveListener(OnEnemyLeaked);
    }

    private void OnEnemyLeaked(Enemy enemy, int hpCost)
    {
        TakeDamage(hpCost);
    }

    public void TakeDamage(int damage)
    {
        _currentHP -= damage;
        _currentHP = Mathf.Max(0, _currentHP);

        gameEvents?.OnCarrotHPChanged?.Invoke(_currentHP, maxHP);

        if (_currentHP <= 0)
        {
            gameEvents?.OnGameLost?.Invoke();
        }
    }

    public void ResetHP()
    {
        _currentHP = maxHP;
        gameEvents?.OnCarrotHPChanged?.Invoke(_currentHP, maxHP);
    }
}
