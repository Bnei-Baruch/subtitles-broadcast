import React from 'react'
import {Button, Modal} from 'react-bootstrap'



const DeleteConfirmation = ({show, handleClose, Message, confirm}) => {
    const handleDelete = () => {
        confirm()
        handleClose()
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
          Do you really want to delete these records? This process cannot be undone.
        </div>
        <div className='modal-footer'>
          <Button color='secondary' onClick={handleClose}>
            Cancel
          </Button>{' '}
          <Button color='danger' onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
    </>
  )
}

export default DeleteConfirmation