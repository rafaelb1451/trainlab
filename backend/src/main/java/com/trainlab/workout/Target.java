package com.trainlab.workout;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class Target {

    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(name = "target_type", length = 20)
    private TargetType type;

    @Column(name = "target_zone")
    private Integer zone;

    @Column(name = "target_min_value")
    private Integer minValue;

    @Column(name = "target_max_value")
    private Integer maxValue;

    @Column(name = "target_display", length = 200)
    private String display;

    @Column(name = "target_absolute_min")
    private Integer absoluteMin;

    @Column(name = "target_absolute_max")
    private Integer absoluteMax;

    @Column(name = "target_absolute_unit", length = 20)
    private String absoluteUnit;

    public Target() {
    }

    public Target(TargetType type, Integer zone, Integer minValue, Integer maxValue, String display,
                  Integer absoluteMin, Integer absoluteMax, String absoluteUnit) {
        this.type = type;
        this.zone = zone;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.display = display;
        this.absoluteMin = absoluteMin;
        this.absoluteMax = absoluteMax;
        this.absoluteUnit = absoluteUnit;
    }

    public TargetType getType() {
        return type;
    }

    public void setType(TargetType type) {
        this.type = type;
    }

    public Integer getZone() {
        return zone;
    }

    public void setZone(Integer zone) {
        this.zone = zone;
    }

    public Integer getMinValue() {
        return minValue;
    }

    public void setMinValue(Integer minValue) {
        this.minValue = minValue;
    }

    public Integer getMaxValue() {
        return maxValue;
    }

    public void setMaxValue(Integer maxValue) {
        this.maxValue = maxValue;
    }

    public String getDisplay() {
        return display;
    }

    public void setDisplay(String display) {
        this.display = display;
    }

    public Integer getAbsoluteMin() {
        return absoluteMin;
    }

    public void setAbsoluteMin(Integer absoluteMin) {
        this.absoluteMin = absoluteMin;
    }

    public Integer getAbsoluteMax() {
        return absoluteMax;
    }

    public void setAbsoluteMax(Integer absoluteMax) {
        this.absoluteMax = absoluteMax;
    }

    public String getAbsoluteUnit() {
        return absoluteUnit;
    }

    public void setAbsoluteUnit(String absoluteUnit) {
        this.absoluteUnit = absoluteUnit;
    }
}
