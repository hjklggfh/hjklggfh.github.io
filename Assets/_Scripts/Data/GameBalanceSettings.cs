using UnityEngine;

[CreateAssetMenu(fileName = "GameBalanceSettings", menuName = "TD/GameBalanceSettings")]
public class GameBalanceSettings : ScriptableObject
{
    private static GameBalanceSettings _instance;
    public static GameBalanceSettings Instance
    {
        get
        {
            if (_instance == null)
                _instance = Resources.Load<GameBalanceSettings>("GameBalanceSettings");
            return _instance;
        }
    }

    [Header("Economy")]
    public int startingGold = 200;
    public float sellRefundRatio = 0.5f;

    [Header("Carrot")]
    public int carrotMaxHP = 10;

    [Header("Gameplay")]
    public bool autoAdvanceWaves = false;
    public float defaultGameSpeed = 1f;
    public float waveAnnouncementDuration = 2f;

    private void OnEnable()
    {
        _instance = this;
    }

    private void OnDisable()
    {
        if (_instance == this) _instance = null;
    }
}
