using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class WaveControlButton : MonoBehaviour
{
    [SerializeField] private Button nextWaveButton;
    [SerializeField] private TextMeshProUGUI buttonText;
    [SerializeField] private GameEvents gameEvents;

    private bool _waitingForPlayer;

    private void Start()
    {
        if (nextWaveButton != null)
            nextWaveButton.onClick.AddListener(StartNextWave);

        if (gameEvents != null)
        {
            gameEvents.OnWaveEnded.AddListener(OnWaveEnded);
            gameEvents.OnWaveStarted.AddListener(OnWaveStarted);
        }

        if (nextWaveButton != null)
            nextWaveButton.gameObject.SetActive(false);
    }

    private void OnDestroy()
    {
        if (gameEvents != null)
        {
            gameEvents.OnWaveEnded.RemoveListener(OnWaveEnded);
            gameEvents.OnWaveStarted.RemoveListener(OnWaveStarted);
        }
    }

    private void OnWaveEnded(int waveIndex)
    {
        var settings = GameBalanceSettings.Instance;
        if (settings != null && settings.autoAdvanceWaves) return;

        _waitingForPlayer = true;
        if (nextWaveButton != null)
            nextWaveButton.gameObject.SetActive(true);

        if (buttonText != null)
        {
            var waveMgr = WaveManager.Instance;
            bool hasMore = waveMgr != null && waveMgr.HasMoreWaves();
            buttonText.text = hasMore ? "Next Wave" : "Final Wave Clear!";
        }
    }

    private void OnWaveStarted(int current, int total)
    {
        _waitingForPlayer = false;
        if (nextWaveButton != null)
            nextWaveButton.gameObject.SetActive(false);
    }

    private void StartNextWave()
    {
        WaveManager.Instance?.StartNextWave();
    }

    public void ForceShow()
    {
        if (nextWaveButton != null)
            nextWaveButton.gameObject.SetActive(true);
    }
}
