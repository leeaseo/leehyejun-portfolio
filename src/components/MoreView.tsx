import React from 'react';
import { PostItem } from '../lib/types';
import { PostCard } from './PostCard';

interface MoreViewProps {
  posts: PostItem[];
  onSelectPost: (slug: string) => void;
}

export const MoreView: React.FC<MoreViewProps> = ({ posts, onSelectPost }) => {
  return (
    <section className="py-6 sm:py-12 max-w-3xl">
      {/* More Section Intro */}
      <div className="mb-10 sm:mb-12">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mb-2">
          Writing & Notes
        </h1>
        <p className="text-[15px] text-[rgba(0,0,0,0.6)]">
          도구와 인터페이스의 물성, 소재 가공, 디자인 철학에 관한 단상과 아카이브.
        </p>
      </div>

      {/* Posts List */}
      <div>
        {posts.map((post) => (
          <PostCard
            key={post.slug}
            post={post}
            onSelectPost={onSelectPost}
          />
        ))}
      </div>
    </section>
  );
};
