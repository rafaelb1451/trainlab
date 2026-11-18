package com.trainlab.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ActivityLapRepository extends JpaRepository<ActivityLap, UUID> {

    List<ActivityLap> findByActivityIdOrderByLapIndexAsc(UUID activityId);

    @Modifying
    @Query("delete from ActivityLap l where l.activityId = :activityId")
    void deleteByActivityId(@Param("activityId") UUID activityId);
}
