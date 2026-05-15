using UnityEngine;

[CreateAssetMenu(fileName = "GameState", menuName = "TD/GameState")]
public class GameStateSO : ScriptableObject
{
    public GameState CurrentState { get; set; } = GameState.Boot;

    public bool IsPlaying =>
        CurrentState == GameState.PreWave ||
        CurrentState == GameState.WaveActive ||
        CurrentState == GameState.PostWave;

    public bool CanBuild =>
        CurrentState == GameState.PreWave ||
        CurrentState == GameState.WaveActive ||
        CurrentState == GameState.PostWave;
}
