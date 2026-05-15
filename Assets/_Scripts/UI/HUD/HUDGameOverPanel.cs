using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class HUDGameOverPanel : MonoBehaviour
{
    [SerializeField] private GameEvents gameEvents;
    [SerializeField] private GameObject panelRoot;
    [SerializeField] private TextMeshProUGUI resultText;
    [SerializeField] private Button restartButton;
    [SerializeField] private Button nextLevelButton;

    private void OnEnable()
    {
        if (gameEvents == null) return;
        gameEvents.OnGameWon.AddListener(OnGameWon);
        gameEvents.OnGameLost.AddListener(OnGameLost);
    }

    private void OnDisable()
    {
        if (gameEvents == null) return;
        gameEvents.OnGameWon.RemoveListener(OnGameWon);
        gameEvents.OnGameLost.RemoveListener(OnGameLost);
    }

    private void Start()
    {
        if (panelRoot != null)
            panelRoot.SetActive(false);

        if (restartButton != null)
            restartButton.onClick.AddListener(RestartLevel);

        if (nextLevelButton != null)
            nextLevelButton.onClick.AddListener(NextLevel);
    }

    private void OnGameWon()
    {
        ShowPanel("Victory!", true);
    }

    private void OnGameLost()
    {
        ShowPanel("Defeat!", false);
    }

    private void ShowPanel(string message, bool showNext)
    {
        if (panelRoot != null)
            panelRoot.SetActive(true);

        if (resultText != null)
            resultText.text = message;

        if (nextLevelButton != null)
            nextLevelButton.gameObject.SetActive(showNext);

        Time.timeScale = 0f;
    }

    private void RestartLevel()
    {
        Time.timeScale = 1f;
        UnityEngine.SceneManagement.SceneManager.LoadScene(
            UnityEngine.SceneManagement.SceneManager.GetActiveScene().name);
    }

    private void NextLevel()
    {
        Time.timeScale = 1f;
        // Level loading logic - override this per game
        int nextIndex = UnityEngine.SceneManagement.SceneManager.GetActiveScene().buildIndex + 1;
        if (nextIndex < UnityEngine.SceneManagement.SceneManager.sceneCountInBuildSettings)
        {
            UnityEngine.SceneManagement.SceneManager.LoadScene(nextIndex);
        }
    }
}
