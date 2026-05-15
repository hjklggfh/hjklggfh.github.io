using UnityEngine;

[CreateAssetMenu(fileName = "EnemyData", menuName = "TD/EnemyData")]
public class EnemyData : ScriptableObject
{
    [Header("Identity")]
    public string enemyName = "Enemy";
    public EnemyType enemyType = EnemyType.Normal;
    public GameObject prefab;

    [Header("Stats")]
    public float maxHP = 100f;
    public float moveSpeed = 2f;
    public float armor = 0f;

    [Header("Reward & Penalty")]
    public int goldReward = 10;
    public int hpLeakCost = 1;

    [Header("Special Flags")]
    public bool isFlying = false;
    public bool isImmuneToSlow = false;
}
