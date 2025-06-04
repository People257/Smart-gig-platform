import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Tabs, message } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import { reviewsApi, getAuthToken } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import styles from './Reviews.module.css';

const { TabPane } = Tabs;

interface Review {
  task: {
    uuid: string;
    title: string;
  };
  user: {
    uuid: string;
    name: string;
    avatar_url: string;
    user_type: 'employer' | 'worker';
  };
  completed_at: string;
  review?: {
    rating: number;
    comment: string;
    date: string;
  };
}

interface ReviewsResponse {
  success: boolean;
  pending_reviews: Review[];
  completed_reviews?: Review[];
  count: number;
  completed_count?: number;
}

const ReviewsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [completedReviews, setCompletedReviews] = useState<Review[]>([]);
  const [ratingValue, setRatingValue] = useState<number>(0);
  const [commentValue, setCommentValue] = useState<string>('');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchReviews();
  }, [user]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await reviewsApi.getPendingReviews(true);

      if (response.success) {
        setPendingReviews(response.data?.pending_reviews || []);
        setCompletedReviews(response.data?.completed_reviews || []);
      }
    } catch (error) {
      console.error('获取评价数据失败:', error);
      message.error('获取评价数据失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (review: Review) => {
    setSelectedReview(review);
    setRatingValue(0);
    setCommentValue('');
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedReview(null);
  };

  const handleRatingChange = (value: number) => {
    setRatingValue(value);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommentValue(e.target.value);
  };

  const submitReview = async () => {
    if (!selectedReview) return;
    if (ratingValue === 0) {
      message.error('请选择评分');
      return;
    }

    try {
      const response = await reviewsApi.createReview({
        rating: ratingValue,
        comment: commentValue,
        task_uuid: selectedReview.task.uuid,
        reviewee_uuid: selectedReview.user.uuid
      });

      if (response.success) {
        message.success('评价提交成功');
        closeReviewModal();
        fetchReviews();
      } else {
        message.error(response.error || '提交评价失败');
      }
    } catch (error) {
      console.error('提交评价失败:', error);
      message.error('提交评价失败，请稍后再试');
    }
  };

  const renderStars = (rating: number, max: number = 5, clickable: boolean = false) => {
    const stars = [];
    for (let i = 1; i <= max; i++) {
      if (clickable) {
        stars.push(
          <span 
            key={i} 
            className={styles.selectableStar}
            onClick={() => handleRatingChange(i)}
          >
            {i <= ratingValue ? <StarFilled style={{ color: '#ffce00' }} /> : <StarOutlined />}
          </span>
        );
      } else {
        stars.push(
          <span key={i} className={styles.star}>
            {i <= rating ? <StarFilled style={{ color: '#ffce00' }} /> : <StarOutlined />}
          </span>
        );
      }
    }
    return stars;
  };

  const renderReviewCard = (review: Review, isCompleted: boolean) => (
    <div className={styles.reviewCard} key={`${review.task.uuid}-${review.user.uuid}`}>
      <div className={styles.reviewHeader}>
        <h3 className={styles.taskTitle}>{review.task.title}</h3>
        <span className={styles.completedDate}>完成时间: {review.completed_at}</span>
      </div>
      <div className={styles.userInfo}>
        <div className={styles.userAvatar}>
          {review.user.avatar_url ? (
            <img src={review.user.avatar_url} alt={review.user.name} />
          ) : (
            <div className={styles.avatarPlaceholder}>{review.user.name.charAt(0)}</div>
          )}
        </div>
        <div className={styles.userDetails}>
          <span className={styles.userName}>{review.user.name}</span>
          <span className={styles.userType}>
            {review.user.user_type === 'employer' ? '雇主' : '零工'}
          </span>
        </div>
      </div>
      
      {isCompleted ? (
        <div className={styles.reviewResult}>
          <div className={styles.rating}>
            {renderStars(review.review?.rating || 0)}
          </div>
          <div className={styles.reviewComment}>
            "{review.review?.comment || ''}"
          </div>
          <div className={styles.reviewDate}>
            评价于 {review.review?.date || ''}
          </div>
        </div>
      ) : (
        <div className={styles.reviewActions}>
          <button 
            className={styles.reviewButton}
            onClick={() => openReviewModal(review)}
          >
            立即评价
          </button>
        </div>
      )}
    </div>
  );

  const renderReviewModal = () => {
    if (!selectedReview) return null;

    return (
      <div className={`${styles.modalOverlay} ${showReviewModal ? styles.visible : ''}`}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>提交评价</h3>
            <button className={styles.closeButton} onClick={closeReviewModal}>×</button>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.taskInfo}>
              <h4>{selectedReview.task.title}</h4>
              <p>评价对象: {selectedReview.user.name}</p>
            </div>
            <div className={styles.ratingSection}>
              <label>评分:</label>
              <div className={styles.ratingStars}>
                {renderStars(ratingValue, 5, true)}
              </div>
            </div>
            <div className={styles.commentSection}>
              <label htmlFor="reviewComment">评价内容:</label>
              <textarea
                id="reviewComment"
                className={styles.commentInput}
                value={commentValue}
                onChange={handleCommentChange}
                placeholder="请输入您的评价内容..."
                rows={4}
              />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button className={styles.cancelButton} onClick={closeReviewModal}>取消</button>
            <button className={styles.submitButton} onClick={submitReview}>提交评价</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.reviewsContainer}>
      <h2 className={styles.pageTitle}>我的评价</h2>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        className={styles.reviewTabs}
      >
        <TabPane tab={`待评价 (${pendingReviews.length})`} key="pending">
          {loading ? (
            <div className={styles.loadingContainer}>加载中...</div>
          ) : pendingReviews.length === 0 ? (
            <div className={styles.emptyContainer}>
              <p>暂无待评价任务</p>
            </div>
          ) : (
            <div className={styles.reviewsList}>
              {pendingReviews.map(review => renderReviewCard(review, false))}
            </div>
          )}
        </TabPane>
        
        <TabPane tab={`已评价 (${completedReviews.length})`} key="completed">
          {loading ? (
            <div className={styles.loadingContainer}>加载中...</div>
          ) : completedReviews.length === 0 ? (
            <div className={styles.emptyContainer}>
              <p>暂无已评价任务</p>
            </div>
          ) : (
            <div className={styles.reviewsList}>
              {completedReviews.map(review => renderReviewCard(review, true))}
            </div>
          )}
        </TabPane>
      </Tabs>
      
      {renderReviewModal()}
    </div>
  );
};

export default ReviewsPage; 