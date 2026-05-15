using UnityEngine;

public static class ExtensionMethods
{
    /// <summary>
    /// 2D rotation toward target with smoothing
    /// </summary>
    public static void LookAt2D(this Transform transform, Vector2 target, float rotationSpeed = 360f)
    {
        Vector2 direction = (target - (Vector2)transform.position).normalized;
        float targetAngle = Mathf.Atan2(direction.y, direction.x) * Mathf.Rad2Deg;
        float angle = Mathf.MoveTowardsAngle(transform.eulerAngles.z, targetAngle, rotationSpeed * Time.deltaTime);
        transform.rotation = Quaternion.Euler(0, 0, angle);
    }

    /// <summary>
    /// Returns the nearest point on a line segment to a given point
    /// </summary>
    public static Vector2 NearestPointOnLine(Vector2 point, Vector2 lineStart, Vector2 lineEnd)
    {
        Vector2 line = lineEnd - lineStart;
        float length = line.magnitude;
        if (length < 0.001f) return lineStart;

        line /= length;
        float t = Mathf.Clamp01(Vector2.Dot(point - lineStart, line));
        return lineStart + t * line;
    }

    /// <summary>
    /// Shorthand to check if a layer is in a LayerMask
    /// </summary>
    public static bool ContainsLayer(this LayerMask mask, int layer)
    {
        return (mask.value & (1 << layer)) != 0;
    }

    /// <summary>
    /// Linear remap from one range to another
    /// </summary>
    public static float Remap(this float value, float fromMin, float fromMax, float toMin, float toMax)
    {
        float t = Mathf.InverseLerp(fromMin, fromMax, value);
        return Mathf.Lerp(toMin, toMax, t);
    }

    /// <summary>
    /// Sets the global scale of a transform uniformly
    /// </summary>
    public static void SetScale(this Transform transform, float scale)
    {
        transform.localScale = Vector3.one * scale;
    }
}
