using System.Collections.Generic;
using UnityEngine;

public class ProjectilePool : Singleton<ProjectilePool>
{
    [System.Serializable]
    public struct ProjectilePrefabEntry
    {
        public TowerType towerType;
        public Projectile prefab;
    }

    [SerializeField] private ProjectilePrefabEntry[] projectilePrefabs;
    [SerializeField] private Transform projectileContainer;
    [SerializeField] private int defaultPoolSize = 20;

    private Dictionary<TowerType, ObjectPool<Projectile>> _pools = new Dictionary<TowerType, ObjectPool<Projectile>>();
    private Dictionary<Projectile, TowerType> _projectileTypeMap = new Dictionary<Projectile, TowerType>();

    protected override void Awake()
    {
        base.Awake();
        if (projectileContainer == null)
        {
            projectileContainer = new GameObject("ProjectileContainer").transform;
            projectileContainer.SetParent(transform);
        }

        foreach (var entry in projectilePrefabs)
        {
            if (entry.prefab != null)
            {
                _pools[entry.towerType] = new ObjectPool<Projectile>(entry.prefab, defaultPoolSize, projectileContainer);
            }
        }
    }

    public Projectile GetProjectile(TowerType towerType, Enemy target, Vector2 spawnPos, Vector2 direction)
    {
        if (!_pools.TryGetValue(towerType, out var pool))
        {
            Debug.LogWarning($"[ProjectilePool] No pool for tower type {towerType}");
            return null;
        }

        var proj = pool.Get();
        proj.transform.position = spawnPos;
        proj.transform.rotation = Quaternion.identity;

        if (target == null)
            proj.SetDirection(direction);

        _projectileTypeMap[proj] = towerType;
        return proj;
    }

    public void ReturnProjectile(Projectile projectile)
    {
        if (projectile == null) return;

        if (_projectileTypeMap.TryGetValue(projectile, out var towerType))
        {
            if (_pools.TryGetValue(towerType, out var pool))
            {
                pool.Return(projectile);
                return;
            }
        }

        Destroy(projectile.gameObject);
    }
}
