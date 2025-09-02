import { React, useId } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";

const styles = {
  default: {
    margin: "0 10px 0 0",
    width: "125px",
  },
};

function buttonStyle(srcStyles, additionalStyle) {
  if (additionalStyle) {
    let cloneSrcStyles = {};
    Object.assign(cloneSrcStyles, srcStyles, additionalStyle);
    return cloneSrcStyles;
  }
  return srcStyles;
}

const dropDownChangeValue = (evt, setStateRef) => {
  setStateRef({
    value: evt.target.getAttribute("data-key"),
    label: evt.target.text,
  });
};

export function DropdownButtonDef({
  id,
  data,
  currentValue,
  setDataRef,
  style,
  className,
  variant,
  key,
  disabled,
}) {
  let defId = useId();

  return (
    <DropdownButton
      id={id ? id : defId}
      key={key ? key : "Info"}
      variant={variant ? variant : "info"}
      className={className ? className : "btn-group"}
      title={currentValue.label}
      style={buttonStyle(styles.default, style)}
      disabled={disabled}
    >
      {data.map((item) => (
        <Dropdown.Item
          data-key={item.value}
          key={item.value}
          eventKey={item.value}
          {...(item.value === currentValue.value && { active: true })}
          onClick={(evt) => dropDownChangeValue(evt, setDataRef)}
        >
          {item.label}
        </Dropdown.Item>
      ))}
    </DropdownButton>
  );
}

export default DropdownButtonDef;
