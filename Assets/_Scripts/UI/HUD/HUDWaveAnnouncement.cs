using System.Collections;
using UnityEngine;
using TMPro;

public class HUDWaveAnnouncement : MonoBehaviour
{
    [SerializeField] private GameEvents gameEvents;
    [SerializeField] private CanvasGroup canvasGroup;
    [SerializeField] private TextMeshProUGUI waveText;
    [SerializeField] private float showDuration = 2f;
    [SerializeField] private float fadeInTime = 0.3f;
    [SerializeField] private float fadeOutTime = 0.5f;

    private Coroutine _announceRoutine;

    private void OnEnable()
    {
        if (gameEvents != null)
            gameEvents.OnWaveStarted.AddListener(OnWaveStarted);
    }

    private void OnDisable()
    {
        if (gameEvents != null)
            gameEvents.OnWaveStarted.RemoveListener(OnWaveStarted);
    }

    private void Start()
    {
        if (canvasGroup != null)
            canvasGroup.alpha = 0f;
    }

    private void OnWaveStarted(int current, int total)
    {
        if (_announceRoutine != null)
            StopCoroutine(_announceRoutine);
        _announceRoutine = StartCoroutine(AnnounceWave(current, total));
    }

    private IEnumerator AnnounceWave(int current, int total)
    {
        if (waveText != null)
            waveText.text = $"Wave {current}";

        // Fade in
        float t = 0f;
        while (t < fadeInTime)
        {
            t += Time.unscaledDeltaTime;
            if (canvasGroup != null)
                canvasGroup.alpha = Mathf.Lerp(0f, 1f, t / fadeInTime);
            yield return null;
        }

        if (canvasGroup != null) canvasGroup.alpha = 1f;

        // Hold
        yield return new WaitForSecondsRealtime(showDuration);

        // Fade out
        t = 0f;
        while (t < fadeOutTime)
        {
            t += Time.unscaledDeltaTime;
            if (canvasGroup != null)
                canvasGroup.alpha = Mathf.Lerp(1f, 0f, t / fadeOutTime);
            yield return null;
        }

        if (canvasGroup != null) canvasGroup.alpha = 0f;
    }
}
