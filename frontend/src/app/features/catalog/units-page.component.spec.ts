import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { Unit } from "./data/catalog.models";
import { UnitService } from "./data/unit.service";
import { UnitsPageComponent } from "./units-page.component";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";

describe("UnitsPageComponent explicit quantity classification", () => {
  let component: UnitsPageComponent;
  let service: jasmine.SpyObj<UnitService>;
  const unit: Unit = { id: 1, code: "QA", name: "Synthetic unit", active: true,
    quantityPolicy: "LEGACY_UNCLASSIFIED", createdAt: "", updatedAt: "" };

  beforeEach(async () => {
    service = jasmine.createSpyObj<UnitService>("UnitService", ["list", "create", "update", "changeStatus"]);
    service.list.and.returnValue(of([unit]));
    service.create.and.returnValue(of({ ...unit, quantityPolicy: "WHOLE" }));
    service.update.and.returnValue(of(unit));
    service.changeStatus.and.returnValue(of(unit));
    await TestBed.configureTestingModule({ imports: [UnitsPageComponent], providers: [
      provideZoneChangeDetection(), { provide: UnitService, useValue: service },
      { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(false) } },
    ] }).compileComponents();
    const fixture = TestBed.createComponent(UnitsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("does not preselect or submit a classification for a new unit", () => {
    expect(component.form.controls.quantityPolicy.value).toBeNull();
    component.form.patchValue({ code: "QA", name: "Synthetic unit" });
    component.submit();
    expect(service.create).not.toHaveBeenCalled();
    expect(component.form.controls.quantityPolicy.invalid).toBeTrue();
  });

  it("creates only with an explicit choice and resets without a default", () => {
    component.form.setValue({ code: "QA", name: "Synthetic unit", quantityPolicy: "WHOLE" });
    component.submit();
    expect(service.create).toHaveBeenCalledOnceWith({ code: "QA", name: "Synthetic unit", quantityPolicy: "WHOLE" });
    expect(component.form.controls.quantityPolicy.value).toBeNull();
    expect(component.form.controls.quantityPolicy.invalid).toBeTrue();
  });

  it("preserves an unclassified legacy unit when editing without a choice", () => {
    component.editUnit(unit);
    expect(component.form.controls.quantityPolicy.value).toBeNull();
    expect(component.form.valid).toBeTrue();
    component.submit();
    expect(service.update).toHaveBeenCalledOnceWith(1, { code: "QA", name: "Synthetic unit", quantityPolicy: null });
  });

  it("can explicitly classify a legacy unit", () => {
    component.editUnit(unit);
    component.form.controls.quantityPolicy.setValue("DECIMAL_2");
    component.submit();
    expect(service.update).toHaveBeenCalledOnceWith(1, { code: "QA", name: "Synthetic unit", quantityPolicy: "DECIMAL_2" });
  });

  it("retains classified values and restores required validation after cancel", () => {
    component.editUnit({ ...unit, quantityPolicy: "DECIMAL_2" });
    expect(component.form.controls.quantityPolicy.value).toBe("DECIMAL_2");
    component.cancelEdit();
    expect(component.form.controls.quantityPolicy.value).toBeNull();
    expect(component.form.controls.quantityPolicy.invalid).toBeTrue();
  });
});
