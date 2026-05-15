using UnityEngine;

public class GoldManager : Singleton<GoldManager>
{
    [SerializeField] private GameEvents gameEvents;

    private int _currentGold;
    private int _startingGold;

    public int CurrentGold => _currentGold;

    protected override void Awake()
    {
        base.Awake();
        var settings = GameBalanceSettings.Instance;
        _startingGold = settings != null ? settings.startingGold : 200;
        _currentGold = _startingGold;
    }

    private void Start()
    {
        gameEvents?.OnGoldChanged?.Invoke(_currentGold);
    }

    public bool CanAfford(int amount)
    {
        return _currentGold >= amount;
    }

    public bool Spend(int amount)
    {
        if (!CanAfford(amount)) return false;

        _currentGold -= amount;
        gameEvents?.OnGoldChanged?.Invoke(_currentGold);
        return true;
    }

    public void Earn(int amount)
    {
        _currentGold += amount;
        gameEvents?.OnGoldChanged?.Invoke(_currentGold);
    }

    public void ResetGold()
    {
        _currentGold = _startingGold;
        gameEvents?.OnGoldChanged?.Invoke(_currentGold);
    }
}
