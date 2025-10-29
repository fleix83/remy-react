-- Create optimized function to get comment counts for multiple posts
CREATE OR REPLACE FUNCTION get_post_comment_counts(post_ids INTEGER[])
RETURNS TABLE (post_id INTEGER, comment_count BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id as post_id,
    COUNT(c.id) as comment_count
  FROM unnest(post_ids) p(id)
  LEFT JOIN comments c ON c.post_id = p.id
  GROUP BY p.id;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION get_post_comment_counts IS 'Efficiently counts comments for multiple posts in a single query';
