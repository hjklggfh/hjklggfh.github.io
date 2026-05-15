using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class HUDTopBar : MonoBehaviour
{
    [SerializeField] private GameEvents gameEvents;

    [Header("Carrot HP")]
    [SerializeField] private Transform heartsContainer;
    [SerializeField] private GameObject heartPrefab;
    [SerializeField] private Sprite heartFull;
    [SerializeField] private Sprite heartEmpty;

    [Header("Gold")]
    [SerializeField] private TextMeshProUGUI goldText;

    [Header("Wave")]
    [SerializeField] private TextMeshProUGUI waveText;

    [Header("Speed")]
    [SerializeField] private Button speedButton;
    [SerializeField] private TextMeshProUGUI speedText;

    private Image[] _hearts;
    private int _maxHP;
    private float _gameSpeed = 1f;

    private void OnEnable()
    {
        if (gameEvents == null) return;
        gameEvents.OnGoldChanged.AddListener(OnGoldChanged);
        gameEvents.OnCarrotHPChanged.AddListener(OnCarrotHPChanged);
        gameEvents.OnWaveStarted.AddListener(OnWaveStarted);
    }

    private void OnDisable()
    {
        if (gameEvents == null) return;
        gameEvents.OnGoldChanged.RemoveListener(OnGoldChanged);
        gameEvents.OnCarrotHPChanged.RemoveListener(OnCarrotHPChanged);
        gameEvents.OnWaveStarted.RemoveListener(OnWaveStarted);
    }

    private void Start()
    {
        if (speedButton != null)
            speedButton.onClick.AddListener(ToggleSpeed);

        UpdateSpeedDisplay();
    }

    public void InitializeHearts(int maxHP)
    {
        _maxHP = maxHP;
        foreach (Transform child in heartsContainer)
            Destroy(child.gameObject);

        _hearts = new Image[maxHP];
        for (int i = 0; i < maxHP; i++)
        {
            var heart = Instantiate(heartPrefab, heartsContainer);
            _hearts[i] = heart.GetComponent<Image>();
        }
    }

    private void OnCarrotHPChanged(int currentHP, int maxHP)
    {
        if (_hearts == null || _hearts.Length == 0)
            InitializeHearts(maxHP);

        if (_hearts == null) return;

        for (int i = 0; i < _hearts.Length; i++)
        {
            if (_hearts[i] != null)
                _hearts[i].sprite = i < currentHP ? heartFull : heartEmpty;
        }
    }

    private void OnGoldChanged(int gold)
    {
        if (goldText != null)
            goldText.text = gold.ToString();
    }

    private void OnWaveStarted(int current, int total)
    {
        if (waveText != null)
            waveText.text = $"Wave {current}/{total}";
    }

    private void ToggleSpeed()
    {
        _gameSpeed = _gameSpeed >= 2f ? 1f : 2f;
        Time.timeScale = _gameSpeed;
        UpdateSpeedDisplay();
    }

    private void UpdateSpeedDisplay()
    {
        if (speedText != null)
            speedText.text = $"{_gameSpeed}x";
    }
}
