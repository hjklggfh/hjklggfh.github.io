using System.Collections.Generic;
using UnityEngine;

public class EnemyFactory : MonoBehaviour
{
    [SerializeField] private GameObject enemyBasePrefab;
    [SerializeField] private Transform enemyContainer;

    private Dictionary<string, ObjectPool<Enemy>> _pools = new Dictionary<string, ObjectPool<Enemy>>();
    private Dictionary<string, Enemy> _prefabCache = new Dictionary<string, Enemy>();

    private void Awake()
    {
        if (enemyContainer == null)
        {
            enemyContainer = new GameObject("EnemyContainer").transform;
            enemyContainer.SetParent(transform);
        }
    }

    public Enemy SpawnEnemy(EnemyData data, BezierPath path)
    {
        if (data == null || data.prefab == null)
        {
            Debug.LogError($"[EnemyFactory] Invalid EnemyData or missing prefab for {data?.enemyName}");
            return null;
        }

        var pool = GetOrCreatePool(data.enemyName, data.prefab);
        var enemy = pool.Get();

        enemy.transform.SetParent(enemyContainer);
        enemy.Initialize(data, path);

        Vector2 startPos = (Vector2)path.transform.position + path.GetStartPoint();
        enemy.transform.position = startPos;

        return enemy;
    }

    private ObjectPool<Enemy> GetOrCreatePool(string key, GameObject prefab)
    {
        if (!_pools.TryGetValue(key, out var pool))
        {
            var prefabEnemy = prefab.GetComponent<Enemy>();
            if (prefabEnemy == null)
            {
                Debug.LogError($"[EnemyFactory] Prefab {prefab.name} has no Enemy component");
                return null;
            }

            pool = new ObjectPool<Enemy>(prefabEnemy, 10, enemyContainer);
            _pools[key] = pool;
        }
        return pool;
    }

    public void ReturnEnemy(Enemy enemy)
    {
        if (enemy == null || enemy.Data == null) return;

        if (_pools.TryGetValue(enemy.Data.enemyName, out var pool))
        {
            pool.Return(enemy);
        }
        else
        {
            Destroy(enemy.gameObject);
        }
    }
}
