import React from 'react'
import {Button, Modal} from 'react-bootstrap'


const DeleteConfirmation = ({undelete, forever, show, handleClose, confirm}) => {
  let msg = undelete ? 'Undelete' : 'Delete';
  if (forever) {
    msg = 'Delete forever';
  }
  return (
    <>
      <>
        <Modal show={show} onHide={handleClose}>
          <div className='modal-header text-center row'>
            <div className='icon-box col-12'>
              <i className={`fa red-circle fa-trash`}></i>
            </div>
            <h2>Are you sure?</h2>
          </div>
          <div className='modal-body'>
            Do you really want to {msg.toLowerCase()} this source?
          </div>
          <div className='modal-footer'>
            <Button color='secondary' onClick={handleClose}>
              Cancel
            </Button>{' '}
            <Button color='danger' onClick={confirm}>
              {msg}
            </Button>
          </div>
        </Modal>
      </>
    </>
  )
}

export default DeleteConfirmation
